import { mkdirSync, writeFileSync } from 'node:fs';
import { buildDialogueState } from '../../src/lib/ai/dialogue/state';
import { decideStructuredClaims } from '../../src/lib/ai/dialogue/structured/gate';
import { digest, evidenceDigest } from '../../src/lib/ai/dialogue/structured/digests';
import { STRUCTURED_VERSION, type SemanticJudgment } from '../../src/lib/ai/dialogue/structured/contracts';
import { acceptanceCases, type Case } from './cases';
export function evaluateCase(test: Case) {
    const state = buildDialogueState('expert-synthetic', test.query, [], test.bundle);
    // Deliberately permissive reviewer tests the deterministic gate independently.
    // It is not an independent semantic judge; gold labels are never model ratings.
    const judgment: SemanticJudgment = { version: STRUCTURED_VERSION, draftDigest: digest(test.response), evidenceDigest: evidenceDigest(test.bundle), stateDigest: digest(state), completeClaimCoverage: true, constraintsSatisfied: true, relevant: true, identity: 'safe-ai', calibration: 'appropriate', highStakes: 'informational', claims: test.response.claims.map(claim => ({ id: claim.id, start: claim.start, end: claim.end, observedCategory: claim.category, observedPresentation: claim.presentation, observedPersonId: claim.personId, verdict: test.verdict || (claim.evidence.length ? 'supported' : 'general-information'), supportedEvidence: structuredClone(claim.evidence), reason: 'Permissive synthetic verdict; not semantic validation' })) };
    test.mutateJudgment?.(judgment);
    const decision = decideStructuredClaims(test.response, judgment, state, test.bundle, new Date('2026-10-11T00:00:00Z'));
    return { id: test.id, fixtureSafe: test.safeByFixture, expectedAllowed: test.expectedAllowed, draft: test.response, decision, sourcePins: test.bundle.evidenceTrace.map(row => ({ spanId: row.spanId, revisionId: row.revisionId, sourceVersion: row.sourceVersion, contentHash: row.contentHash, speakerRole: row.speakerRole, text: row.text })), humanRating: null, modelRating: null };
}
export function evaluateAcceptance() {
    const cases = acceptanceCases(), traces = cases.map(evaluateCase);
    const counts = { safeReleased: 0, unsafeReleased: 0, unsafeBlocked: 0, safeBlocked: 0 };
    for (const trace of traces) counts[trace.fixtureSafe ? trace.decision.allowed ? 'safeReleased' : 'safeBlocked' : trace.decision.allowed ? 'unsafeReleased' : 'unsafeBlocked']++;
    return { mode: 'permissive-synthetic-verifier-contracts', datasetDigest: digest(cases.map(({ mutateJudgment, ...test }) => ({ ...test, judgmentMutation: !!mutateJudgment }))), realProviderCalls: 0, humanAssessment: 'not-run', semanticModelAssessment: 'not-run', confusionMatrix: counts, convention: 'positive = release; false positive = unsafe release; false negative = safe refusal', traces };
}
if (require.main === module) {
    const report = evaluateAcceptance(), destination = 'audit/exp17-acceptance-20261011';
    mkdirSync(destination, { recursive: true });
    writeFileSync(`${destination}/claim-evidence-traces.json`, JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ cases: report.traces.length, mismatches: report.traces.filter(t => t.decision.allowed !== t.expectedAllowed).map(t => t.id), confusionMatrix: report.confusionMatrix, realProviderCalls: report.realProviderCalls }) + '\n');
}
