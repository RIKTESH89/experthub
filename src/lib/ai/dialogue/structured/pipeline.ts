import { detachedSnapshot, immutableResult, isSnapshotMutation } from "./snapshots";
import { constrainLiveEvidence } from "./live-pins";
import type { EvidenceBundle } from "@/lib/retrieval/bundle";
import type { HistoryMessage } from "@/lib/ai/history";
import { buildDialogueState, CONTINUITY_INSTRUCTIONS } from "../state";
import { groundedStyle } from "../style";
import { localDialogueEvaluationEnabled } from "../local-evaluation";
import { LIMITS, STRUCTURED_VERSION, draftSchema, judgmentSchema, type StructuredAdapters, type TurnResult, type DialogueContext } from "./contracts";
import { digest, evidenceDigest } from "./digests";
import { checkStructuredDraft, decideStructuredClaims } from "./gate";
import { GENERATION_INSTRUCTIONS, VERIFICATION_INSTRUCTIONS } from "./prompts";
export interface StructuredTurnInput {
    expertId: string;
    query: string;
    history: HistoryMessage[];
    bundle: EvidenceBundle;
    adapters: StructuredAdapters;
    maxAttempts?: number;
    deadlineMs?: number;
    signal?: AbortSignal;
}
const blockedText = "I’m an AI representation, not the actual person. I can’t support that response from the available evidence and verification. Could you clarify the question or provide an authorized source?";
/** Total deadline and abort propagation bound hung/rejecting adapters, including repair.
 * Synthetic-only runner: no production semantic release or real-model calls are enabled. */
export async function runStructuredDialogue(input: StructuredTurnInput): Promise<TurnResult> {
    const started = Date.now();
    let attempts = 0, calls = 0;
    const blocked = (reasons: string[]): TurnResult => immutableResult({ version: STRUCTURED_VERSION, outcome: "blocked", text: blockedText, decision: { allowed: false, reasons, acceptedSpanIds: [], unknownClaimIds: [] }, attempts, providerCalls: calls, semanticEvidence: "synthetic-fixture-only", elapsedMs: Date.now() - started });
    if (!localDialogueEvaluationEnabled())
        return blocked(["local-evaluation-disabled"]);
    if (input.signal?.aborted) return blocked(["evaluation-cancelled"]);
    if (!input.adapters?.generator || !input.adapters.verifier || !input.adapters.evidence || typeof input.adapters.generator.generate !== "function" || typeof input.adapters.verifier.verify !== "function" || typeof input.adapters.evidence.revalidate !== "function")
        return blocked(["invalid-adapters"]);
    if (input.adapters.generator.id === input.adapters.verifier.id)
        return blocked(["separate-verifier-required"]);
    if (input.adapters.generator.kind !== "synthetic" || input.adapters.verifier.kind !== "synthetic")
        return blocked(["real-model-evaluation-not-authorized"]);
    const expertId = input.expertId, query = input.query;
    const adapters = { generator: input.adapters.generator.generate.bind(input.adapters.generator), verifier: input.adapters.verifier.verify.bind(input.adapters.verifier), evidence: input.adapters.evidence.revalidate.bind(input.adapters.evidence) };
    let boundary: "generation" | "verification" | "evidence" = "generation";
    const retained: {
        value: unknown;
        pin: string;
        reason: string;
    }[] = [];
    const checkedSnapshot = <T>(value: T, reason: string): T => { const copy = detachedSnapshot(value); retained.push({ value: copy, pin: digest(copy), reason }); return copy; };
    const assertRetained = () => { const changed = retained.find(item => digest(item.value) !== item.pin); if (changed)
        throw new Error(changed.reason); };
    const maxAttempts = Number.isInteger(input.maxAttempts) ? Math.min(LIMITS.attempts, Math.max(1, input.maxAttempts!)) : LIMITS.attempts;
    const deadline = started + Math.min(LIMITS.deadlineMs, Math.max(1, input.deadlineMs || LIMITS.deadlineMs));
    const controller = new AbortController();
    const timed = async <T>(action: (signal: AbortSignal) => Promise<T>): Promise<T> => {
        if (input.signal?.aborted) throw new Error("evaluation-cancelled");
        const remaining = deadline - Date.now();
        if (remaining <= 0)
            throw new Error("evaluation-deadline");
        let timer: ReturnType<typeof setTimeout> | undefined;
        let onAbort: (() => void) | undefined;
        try {
            const result = await Promise.race([Promise.resolve().then(() => { if (input.signal?.aborted) throw new Error("evaluation-cancelled"); return action(controller.signal); }), new Promise<T>((_resolve, reject) => {
                onAbort = () => { controller.abort(); reject(new Error("evaluation-cancelled")); };
                input.signal?.addEventListener("abort", onAbort, {once:true});
                if (input.signal?.aborted) onAbort();
                timer = setTimeout(() => { controller.abort(); reject(new Error("evaluation-deadline")); }, remaining);
            })]);
            if (input.signal?.aborted) throw new Error("evaluation-cancelled");
            assertRetained();
            return result;
        }
        finally {
            if (timer)
                clearTimeout(timer);
            if (onAbort) input.signal?.removeEventListener("abort", onAbort);
        }
    };
    let bundle: EvidenceBundle, initial: EvidenceBundle, history: HistoryMessage[], feedback: string[] = [];
    try {
        if (!expertId || !query.trim() || query.length > 8000 || Buffer.byteLength(JSON.stringify(input.bundle), "utf8") > 120000)
            return blocked(["invalid-or-oversized-context"]);
        initial = detachedSnapshot(input.bundle);
        bundle = structuredClone(initial);
        if (input.history.length > 12 || input.history.some(m => m.content.length > 8000) || Buffer.byteLength(JSON.stringify(input.history), "utf8") > 48000)
            return blocked(["history-context-budget"]);
        history = detachedSnapshot(input.history);
    }
    catch {
        return blocked(["invalid-or-oversized-context"]);
    }
    try {
        for (attempts = 1; attempts <= maxAttempts; attempts++) {
            const context: DialogueContext = { state: buildDialogueState(expertId, query, history, bundle), bundle: structuredClone(bundle), style: groundedStyle(bundle, expertId), history: structuredClone(history) };
            if (Buffer.byteLength(JSON.stringify(context), "utf8") > 200000)
                return blocked(["adapter-context-budget"]);
            const generatorData = checkedSnapshot({ version: STRUCTURED_VERSION, instructions: GENERATION_INSTRUCTIONS + "\n" + CONTINUITY_INSTRUCTIONS, context, feedback: [...feedback], attempt: attempts }, "generator-mutated-context");
            boundary = "generation";
            calls++;
            const raw = await timed(signal => adapters.generator(Object.freeze({ ...generatorData, signal })));
            const parsed = draftSchema.safeParse(raw);
            if (!parsed.success) {
                feedback = ["invalid-structured-draft"];
                if (attempts === maxAttempts)
                    return blocked(feedback);
                continue;
            }
            const draft = detachedSnapshot(parsed.data), structural = checkStructuredDraft(draft);
            if (structural.length) {
                feedback = structural;
                if (attempts === maxAttempts)
                    return immutableResult({ ...blocked(feedback), draft });
                continue;
            }
            boundary = "evidence";
            const liveInput = checkedSnapshot(bundle, "live-adapter-mutated-input");
            bundle = detachedSnapshot(constrainLiveEvidence(initial, detachedSnapshot(await timed(signal => adapters.evidence(liveInput, signal)))));
            if (bundle.version !== "intent-evidence-v1")
                return blocked(["invalid-live-evidence-contract"]);
            const releaseContext: DialogueContext = detachedSnapshot({ state: buildDialogueState(expertId, query, history, bundle), bundle: structuredClone(bundle), style: groundedStyle(bundle, expertId), history: structuredClone(history) });
            const request = detachedSnapshot({ version: STRUCTURED_VERSION, instructions: VERIFICATION_INSTRUCTIONS + "\n" + CONTINUITY_INSTRUCTIONS, draft, context: releaseContext, draftDigest: digest(draft), evidenceDigest: evidenceDigest(bundle), stateDigest: digest(releaseContext.state) });
            const approvedPin = digest(request);
            const verifierData = checkedSnapshot(request, "verifier-mutated-snapshot");
            boundary = "verification";
            calls++;
            const review = await timed(signal => adapters.verifier(Object.freeze({ ...verifierData, signal })));
            if (digest(request) !== approvedPin)
                return blocked(["verifier-mutated-snapshot"]);
            const judged = judgmentSchema.safeParse(review);
            if (!judged.success) {
                feedback = ["invalid-semantic-judgment"];
                if (attempts === maxAttempts)
                    return blocked(feedback);
                continue;
            }
            const judgment = detachedSnapshot(judged.data);
            const judgmentPin = digest(judgment);
            const decision = detachedSnapshot(decideStructuredClaims(draft, judgment, releaseContext.state, bundle));
            if (decision.allowed) {
                // A final permission check occurs after potentially slow semantic judgment.
                // Compare the exact source/temporal snapshot. This is still not atomic delivery.
                boundary = "evidence";
                const finalInput = checkedSnapshot(bundle, "live-adapter-mutated-input");
                const finalBundle = detachedSnapshot(constrainLiveEvidence(initial, detachedSnapshot(await timed(signal => adapters.evidence(finalInput, signal)))));
                assertRetained();
                if (digest(request) !== approvedPin || digest(draft) !== request.draftDigest || digest(judgment) !== judgmentPin)
                    return blocked(["approved-snapshot-changed"]);
                if (evidenceDigest(finalBundle) !== request.evidenceDigest) {
                    feedback = ["evidence-changed-after-judgment"];
                    bundle = structuredClone(finalBundle);
                    if (attempts === maxAttempts)
                        return blocked(feedback);
                    continue;
                }
                const immediateDecision=decideStructuredClaims(draft,judgment,releaseContext.state,finalBundle);
                if(!immediateDecision.allowed)return blocked(immediateDecision.reasons);
                return immutableResult({ version: STRUCTURED_VERSION, outcome: "released-synthetic-evaluation", text: "I’m an AI representation, not the actual person.\n\n" + (releaseContext.state.temporal.mode === "as-of" ? `Historical frame as of ${releaseContext.state.temporal.validAt.toISOString().slice(0, 10)}; not a current belief.\n\n` : "") + draft.text, decision:immediateDecision, attempts, providerCalls: calls, semanticEvidence: "synthetic-fixture-only", draft, judgment, releaseBundle: finalBundle, elapsedMs: Date.now() - started });
            }
            feedback = decision.reasons;
            if (attempts === maxAttempts)
                return immutableResult({ ...blocked(feedback), draft, judgment });
        }
    }
    catch (error) {
        const retainedReason = error instanceof Error && ["generator-mutated-context", "verifier-mutated-snapshot", "live-adapter-mutated-input"].includes(error.message) ? error.message : null;
        return blocked([retainedReason || (input.signal?.aborted ? "evaluation-cancelled" : isSnapshotMutation(error) ? boundary === "generation" ? "generator-mutated-context" : boundary === "verification" ? "verifier-mutated-snapshot" : "immutable-adapter-snapshot-violation" : error instanceof Error && error.message === "evaluation-deadline" ? "evaluation-deadline" : "adapter-or-permission-failure")]);
    }
    finally {
        controller.abort();
    }
    return blocked(feedback.length ? feedback : ["evaluation-budget"]);
}
