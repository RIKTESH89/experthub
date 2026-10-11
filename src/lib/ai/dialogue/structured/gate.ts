import type { EvidenceBundle } from "@/lib/retrieval/bundle";
import type { DialogueState } from "../state";
import { digest, evidenceDigest } from "./digests";
import { LIMITS, type EvidenceReference, type StructuredDraft, type SemanticJudgment, type GateDecision } from "./contracts";
import { literalPersonSupport, quotationsSupported } from "./literal-support";
const sameReference = (a: EvidenceReference, b: EvidenceReference) => a.spanId === b.spanId && a.revisionId === b.revisionId && a.contentHash === b.contentHash && a.sourceVersion === b.sourceVersion;
const uniqueReferences = (rows: EvidenceReference[]) => rows.every((row, i) => !rows.slice(0, i).some(prior => sameReference(row, prior)));
export function checkStructuredDraft(draft: StructuredDraft): string[] {
    const errors: string[] = [];
    if (/\[[^\]]+\]\([^)]+\)|<a\b[^>]*>|<https?:\/\/[^>]*>/i.test(draft.text))
        errors.push("inline-source-citation-untyped");
    if (Buffer.byteLength(draft.text, "utf8") > LIMITS.draftBytes)
        errors.push("draft-byte-budget");
    const ids = new Set<string>();
    let previousEnd = 0;
    for (const claim of [...draft.claims].sort((a, b) => a.start - b.start)) {
        if (ids.has(claim.id))
            errors.push("duplicate-claim-id");
        ids.add(claim.id);
        if (claim.start < previousEnd || claim.end > draft.text.length || claim.end <= claim.start)
            errors.push("overlapping-or-invalid-ranges");
        if (draft.text.slice(previousEnd, claim.start).trim())
            errors.push("unannotated-text");
        if (!draft.text.slice(claim.start, claim.end).trim())
            errors.push("empty-claim");
        previousEnd = claim.end;
    }
    if (draft.text.slice(previousEnd).trim())
        errors.push("unannotated-text");
    return Array.from(new Set(errors));
}
/** Reference/permission/time gates are deterministic; semantic verdicts remain adapter
 * judgments, not truth proofs. Call only after runtime schemas validate both objects. */
export function decideStructuredClaims(draft: StructuredDraft, judgment: SemanticJudgment, state: DialogueState, bundle: EvidenceBundle, now = new Date()): GateDecision {
    const reasons = checkStructuredDraft(draft), accepted = new Set<string>(), unknown: string[] = [];
    if (judgment.draftDigest !== digest(draft) || judgment.evidenceDigest !== evidenceDigest(bundle) || judgment.stateDigest !== digest(state))
        reasons.push("judgment-snapshot-mismatch");
    if (!judgment.completeClaimCoverage)
        reasons.push("semantic-coverage-incomplete");
    if (!judgment.constraintsSatisfied)
        reasons.push("requested-constraints-dropped");
    if (!judgment.relevant)
        reasons.push("irrelevant-response");
    if (judgment.identity !== "safe-ai")
        reasons.push("identity-or-impersonation");
    if (judgment.calibration !== "appropriate")
        reasons.push("uncalibrated-answer");
    if (!["informational", "not-applicable"].includes(judgment.highStakes))
        reasons.push("high-stakes-unsafe");
    const failures = bundle.trace.failures;
    if (failures.some(f => f !== "semantic-unavailable; lexical fallback" && f !== "release-temporal-coverage-unavailable"))
        reasons.push("live-evidence-failure");
    const ids = new Set(judgment.claims.map(c => c.id));
    if (ids.size !== judgment.claims.length || judgment.claims.length !== draft.claims.length)
        reasons.push("independent-claim-set-mismatch");
    const rows = [...bundle.evidenceTrace, ...bundle.temporalTrace.stances];
    for (const claim of draft.claims) {
        const assessment = judgment.claims.find(c => c.id === claim.id);
        if (!assessment || assessment.start !== claim.start || assessment.end !== claim.end || assessment.observedCategory !== claim.category || assessment.observedPresentation !== claim.presentation || assessment.observedPersonId !== claim.personId) {
            reasons.push("independent-claim-classification-mismatch");
            continue;
        }
        if (["unsafe", "unsupported", "contradicted"].includes(assessment.verdict)) {
            reasons.push("semantic-" + assessment.verdict);
            continue;
        }
        if (assessment.verdict === "supported" && !claim.evidence.length)
            reasons.push("supported-verdict-without-evidence");
        const person = claim.category === "person-belief" || claim.category === "person-biography";
        const sourced = person || claim.category === "source-explanation";
        if (claim.category === "high-stakes-advice")
            reasons.push("high-stakes-advice-unreleased");
        if (claim.category === "person-biography")
            reasons.push("biography-extractor-unavailable");
        if (person && claim.personId !== state.expertId)
            reasons.push("unresolved-person-identity");
        if (!person && claim.personId !== undefined)
            reasons.push("person-attribution-category-mismatch");
        if (sourced && (claim.evidence.length === 0 || assessment.verdict !== "supported"))
            reasons.push("missing-supported-evidence");
        if (failures.includes("release-temporal-coverage-unavailable") && (person || claim.evidence.length))
            reasons.push("temporal-coverage-incomplete");
        if (assessment.supportedEvidence.length !== claim.evidence.length || assessment.supportedEvidence.some(r => !claim.evidence.some(other => sameReference(r, other))))
            reasons.push("independent-evidence-mismatch");
        if (!uniqueReferences(claim.evidence) || !uniqueReferences(assessment.supportedEvidence))
            reasons.push("duplicate-evidence-reference");
        if (assessment.verdict === "unknown") {
            if (claim.category !== "evidence-gap" || claim.presentation !== "uncertainty" || claim.gapIndex === undefined || !bundle.gaps[claim.gapIndex] || claim.evidence.length)
                reasons.push("unknown-presented-as-fact");
            else
                unknown.push(claim.id);
        }
        else if (claim.category === "evidence-gap")
            reasons.push("gap-presented-as-supported-fact");
        if (!sourced && claim.category !== "evidence-gap" && !["general-information", "supported"].includes(assessment.verdict))
            reasons.push("unsupported-general-category");
        if (claim.category === "new-application" && claim.presentation !== "uncertainty")
            reasons.push("application-not-labelled-inference");
        if (claim.category === "new-application" && (!claim.evidence.length || assessment.verdict !== "supported"))
            reasons.push("inference-without-supported-evidence");
        const supportingRows = rows.filter(row => claim.evidence.some(ref => sameReference(ref, row)));
        const claimText = draft.text.slice(claim.start, claim.end);
        if (person && !literalPersonSupport(claimText, supportingRows))
            reasons.push("person-entailment-unverified");
        if ((sourced || claim.evidence.length) && !quotationsSupported(claimText, supportingRows))
            reasons.push("quotation-not-in-cited-span");
        for (const reference of claim.evidence) {
            const matches = rows.filter(r => sameReference(reference, r));
            const row = matches[0];
            if (!row || matches.some(r => r.text !== row.text) || !bundle.sources.some(s => row.chunkIds.includes(s.metadata.vectorId as string))) {
                reasons.push("missing-or-stale-live-reference");
                continue;
            }
            if (person && (row.kind !== "explicit" || !row.endorsedByOwner || row.authorId !== state.expertId || row.speakerId !== state.expertId || row.speakerRole !== "author"))
                reasons.push("unsupported-person-attribution");
            if (bundle.temporalTrace.supersededStances.some(r => r.spanId === reference.spanId))
                reasons.push("superseded-reference");
            if (bundle.temporalTrace.relations.some(r => r.type === "supersedes" && [...bundle.temporalTrace.stances, ...bundle.temporalTrace.supersededStances].some(s => sameReference(reference, s) && s.id === r.to)))
                reasons.push("superseded-reference");
            if (bundle.temporalTrace.relations.some(r => ["contradiction", "unresolved-disagreement"].includes(r.type) && r.evidenceSpanIds.includes(reference.spanId)))
                reasons.push("unresolved-evidence-conflict");
            if (claim.frame.mode !== "recorded") {
                const stance = bundle.temporalTrace.stances.find(s => sameReference(reference, s));
                const at = claim.frame.mode === "current" ? now : new Date(claim.frame.at || "");
                if (!stance || !stance.validFrom || !Number.isFinite(at.getTime()) || !Number.isFinite(stance.validFrom.getTime()) || stance.validFrom > at || (stance.validUntil && (!Number.isFinite(stance.validUntil.getTime()) || stance.validUntil <= at)))
                    reasons.push("valid-time-unverified");
                if (claim.frame.mode === "as-of" && (state.temporal.mode !== "as-of" || bundle.temporalTrace.mode !== "as-of" || bundle.temporalTrace.validAt !== at.toISOString() || state.temporal.validAt.toISOString() !== at.toISOString()))
                    reasons.push("historical-frame-mismatch");
            }
            if (person && state.personFrame === "current" && claim.frame.mode !== "current")
                reasons.push("current-question-downgraded-to-recorded");
            if (person && state.personFrame === "historical" && claim.frame.mode !== "as-of")
                reasons.push("historical-question-downgraded");
            if (person && claim.frame.mode === "recorded" && /^The expert (?:currently )?(?:prefers|recommends) /.test(claimText))
                reasons.push("recorded-source-presented-as-current-belief");
            accepted.add(reference.spanId);
        }
    }
    const unique = Array.from(new Set(reasons));
    return { allowed: unique.length === 0, reasons: unique, acceptedSpanIds: unique.length ? [] : Array.from(accepted), unknownClaimIds: unique.length ? [] : unknown };
}
