import { constrainLiveEvidence } from "./live-pins";
import type { EvidenceBundle } from "@/lib/retrieval/bundle";
import type { HistoryMessage } from "@/lib/ai/history";
import { buildDialogueState } from "../state";
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
}
const blockedText = "I’m an AI representation, not the actual person. I can’t support that response from the available evidence and verification. Could you clarify the question or provide an authorized source?";
/** Total deadline and abort propagation bound hung/rejecting adapters, including repair.
 * Synthetic-only runner: no production semantic release or real-model calls are enabled. */
export async function runStructuredDialogue(input: StructuredTurnInput): Promise<TurnResult> {
    const started = Date.now();
    let attempts = 0, calls = 0;
    const blocked = (reasons: string[]): TurnResult => ({ version: STRUCTURED_VERSION, outcome: "blocked", text: blockedText, decision: { allowed: false, reasons, acceptedSpanIds: [], unknownClaimIds: [] }, attempts, providerCalls: calls, semanticEvidence: "synthetic-fixture-only", elapsedMs: Date.now() - started });
    if (!localDialogueEvaluationEnabled())
        return blocked(["local-evaluation-disabled"]);
    if (!input.adapters?.generator || !input.adapters.verifier || !input.adapters.evidence || typeof input.adapters.generator.generate !== "function" || typeof input.adapters.verifier.verify !== "function" || typeof input.adapters.evidence.revalidate !== "function")
        return blocked(["invalid-adapters"]);
    if (input.adapters.generator.id === input.adapters.verifier.id)
        return blocked(["separate-verifier-required"]);
    if (input.adapters.generator.kind !== "synthetic" || input.adapters.verifier.kind !== "synthetic")
        return blocked(["real-model-evaluation-not-authorized"]);
    const maxAttempts = Number.isInteger(input.maxAttempts) ? Math.min(LIMITS.attempts, Math.max(1, input.maxAttempts!)) : LIMITS.attempts;
    const deadline = started + Math.min(LIMITS.deadlineMs, Math.max(1, input.deadlineMs || LIMITS.deadlineMs));
    const controller = new AbortController();
    const timed = async <T>(action: (signal: AbortSignal) => Promise<T>): Promise<T> => {
        const remaining = deadline - Date.now();
        if (remaining <= 0)
            throw new Error("evaluation-deadline");
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            return await Promise.race([Promise.resolve().then(() => action(controller.signal)), new Promise<T>((_resolve, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("evaluation-deadline")); }, remaining); })]);
        }
        finally {
            if (timer)
                clearTimeout(timer);
        }
    };
    let bundle: EvidenceBundle, initial: EvidenceBundle, history: HistoryMessage[], feedback: string[] = [];
    try {
        if (!input.expertId || !input.query.trim() || input.query.length > 8000 || Buffer.byteLength(JSON.stringify(input.bundle), "utf8") > 120000)
            return blocked(["invalid-or-oversized-context"]);
        initial = structuredClone(input.bundle);
        bundle = structuredClone(initial);
        history = structuredClone(input.history).slice(-12).map(m => ({ ...m, content: m.content.slice(0, 2000) }));
    }
    catch {
        return blocked(["invalid-or-oversized-context"]);
    }
    try {
        for (attempts = 1; attempts <= maxAttempts; attempts++) {
            const context: DialogueContext = { state: buildDialogueState(input.expertId, input.query, history, bundle), bundle: structuredClone(bundle), style: groundedStyle(bundle, input.expertId), history: structuredClone(history) };
            const pin = digest(context);
            calls++;
            const raw = await timed(signal => input.adapters.generator.generate(Object.freeze({ version: STRUCTURED_VERSION, instructions: GENERATION_INSTRUCTIONS, context, feedback: [...feedback], attempt: attempts, signal })));
            if (digest(context) !== pin)
                return blocked(["generator-mutated-context"]);
            const parsed = draftSchema.safeParse(raw);
            if (!parsed.success) {
                feedback = ["invalid-structured-draft"];
                if (attempts === maxAttempts)
                    return blocked(feedback);
                continue;
            }
            const draft = structuredClone(parsed.data), structural = checkStructuredDraft(draft);
            if (structural.length) {
                feedback = structural;
                if (attempts === maxAttempts)
                    return { ...blocked(feedback), draft };
                continue;
            }
            bundle = constrainLiveEvidence(initial, structuredClone(await timed(signal => input.adapters.evidence.revalidate(structuredClone(bundle), signal))));
            if (bundle.version !== "intent-evidence-v1")
                return blocked(["invalid-live-evidence-contract"]);
            const releaseContext: DialogueContext = { state: buildDialogueState(input.expertId, input.query, history, bundle), bundle: structuredClone(bundle), style: groundedStyle(bundle, input.expertId), history: structuredClone(history) };
            const request = { version: STRUCTURED_VERSION, instructions: VERIFICATION_INSTRUCTIONS, draft, context: releaseContext, draftDigest: digest(draft), evidenceDigest: evidenceDigest(bundle), stateDigest: digest(releaseContext.state) };
            const verifierPin = digest(request);
            calls++;
            const review = await timed(signal => input.adapters.verifier.verify(Object.freeze({ ...request, signal })));
            if (digest(request) !== verifierPin)
                return blocked(["verifier-mutated-snapshot"]);
            const judged = judgmentSchema.safeParse(review);
            if (!judged.success) {
                feedback = ["invalid-semantic-judgment"];
                if (attempts === maxAttempts)
                    return blocked(feedback);
                continue;
            }
            const decision = decideStructuredClaims(draft, judged.data, releaseContext.state, bundle);
            if (decision.allowed) {
                // A final permission check occurs after potentially slow semantic judgment.
                // Compare the exact source/temporal snapshot. This is still not atomic delivery.
                const finalBundle = constrainLiveEvidence(initial, await timed(signal => input.adapters.evidence.revalidate(structuredClone(bundle), signal)));
                if (evidenceDigest(finalBundle) !== request.evidenceDigest) {
                    feedback = ["evidence-changed-after-judgment"];
                    bundle = structuredClone(finalBundle);
                    if (attempts === maxAttempts)
                        return blocked(feedback);
                    continue;
                }
                return { version: STRUCTURED_VERSION, outcome: "released-synthetic-evaluation", text: "I’m an AI representation, not the actual person.\n\n" + (releaseContext.state.temporal.mode === "as-of" ? `Historical frame as of ${releaseContext.state.temporal.validAt.toISOString().slice(0, 10)}; not a current belief.\n\n` : "") + draft.text, decision, attempts, providerCalls: calls, semanticEvidence: "synthetic-fixture-only", draft, judgment: judged.data, releaseBundle: finalBundle, elapsedMs: Date.now() - started };
            }
            feedback = decision.reasons;
            if (attempts === maxAttempts)
                return { ...blocked(feedback), draft, judgment: judged.data };
        }
    }
    catch (error) {
        return blocked([error instanceof Error && error.message === "evaluation-deadline" ? "evaluation-deadline" : "adapter-or-permission-failure"]);
    }
    finally {
        controller.abort();
    }
    return blocked(feedback.length ? feedback : ["evaluation-budget"]);
}
