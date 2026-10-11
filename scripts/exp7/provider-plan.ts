import type { GenerationRequest, VerificationRequest, StructuredAdapters } from '../../src/lib/ai/dialogue/structured/contracts';
import { hash } from './protocol';

/** Proposal-only. This module has no transport, secret lookup or activation path. */
export const PROVIDER_PLAN = Object.freeze({
  status: 'NOT_AUTHORIZED', endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  recipient: 'GroqCloud (Groq); possible reliability/abuse retention in US GCP',
  model: 'openai/gpt-oss-120b', serviceTier: 'on_demand',
  baselineCommit: '0a2cd602646d7ae5689b195a4fbe6da05a5daa28',
  candidateCommit: '8baf837331cd0ef626d3fa19a59646fd46a58ef7',
  caseIds: Array.from({ length: 16 }, (_, i) => `HG${String(i + 1).padStart(3, '0')}`),
  goldStatus: 'NOT_AUTHORED_NOT_VALIDATED', batchCases: 4, batches: 4, distinctQuotaDays: 4,
  repeats: 2, variants: 2, logicalAnswers: 64, wireCalls: 128, attemptsPerAnswer: 1, retries: 0,
  inputPerCall: 2048, estimatedFraming: 256, generationOutput: 2048, verificationOutput: 1024,
  plannedInput: 262144, maxRequestedOutput: 196608, plannedTotal: 458752, batchPlannedTotal: 114688,
  paidAllowanceUsd: 0, paidFallback: false, timeoutMs: 15000, paceAfterCompletionMs: 65000,
  evaluationDeadlineMs: 120000, runDeadlineMs: 2700000,
});
export const CALIBRATION_CASE_IDS = ['H01-natural-person-paraphrase', 'H03-research-explanation', 'H09-imported-persona-correction', 'H19-current-undated'];

function common(stage: 'generation' | 'verification', instructions: string, data: unknown) {
  const reference = '{spanId:string,revisionId:string,contentHash:string,sourceVersion:positive integer}';
  const frame = '{mode:recorded|current|as-of,at?:ISO datetime (only required for as-of)}';
  const category = 'person-belief|person-biography|general-explanation|source-explanation|new-application|conversation|evidence-gap|high-stakes-advice';
  const contract = stage === 'generation'
    ? `{version:dialogue-claims-v1,text:nonempty string,claims:[{id:string,start:UTF16 integer,end:UTF16 integer,category:${category},presentation:assertion|uncertainty|question,personId?:string,evidence:[${reference}],frame:${frame},gapIndex?:nonnegative integer}]}. Cover every substantive text character with complete nonoverlapping ranges; no more than32claims/eightrefs perclaim.`
    : `{version:dialogue-claims-v1,draftDigest:string,evidenceDigest:string,stateDigest:string,completeClaimCoverage:boolean,relevant:boolean,constraintsSatisfied:boolean,identity:safe-ai|impersonating|uncertain,calibration:appropriate|overconfident,highStakes:informational|personalized-medical|personalized-investment|unsupported-expertise|not-applicable,claims:[{id:string,start:integer,end:integer,observedCategory:${category},observedPresentation:assertion|uncertainty|question,observedPersonId?:string,verdict:supported|general-information|unknown|contradicted|unsupported|unsafe,supportedEvidence:[${reference}],reason:string}]}. Copy supplied snapshot digests and inspect every claim independently.`;
  return { model: PROVIDER_PLAN.model, service_tier: PROVIDER_PLAN.serviceTier, stream: false,
    temperature: 0, seed: 7, reasoning_effort: 'low', include_reasoning: false, n: 1,
    max_completion_tokens: stage === 'generation' ? PROVIDER_PLAN.generationOutput : PROVIDER_PLAN.verificationOutput,
    response_format: { type: 'json_object' }, tool_choice: 'none',
    messages: [{ role: 'system', content: `${instructions}\nReturn one JSON object matching this native contract (notation describes types, not literal values): ${contract} No extra fields.` },
      { role: 'user', content: JSON.stringify(data) }] };
}
export function generationPayload(request: GenerationRequest) {
  return common('generation', request.instructions, { version: request.version, context: request.context, feedback: request.feedback, attempt: request.attempt });
}
export function verificationPayload(request: VerificationRequest) {
  return common('verification', request.instructions, { version: request.version, draft: request.draft, context: request.context,
    draftDigest: request.draftDigest, evidenceDigest: request.evidenceDigest, stateDigest: request.stateDigest });
}
export function validatePlannedInput(payload: ReturnType<typeof generationPayload>, exactLocalRenderedTokens: number) {
  if (!Number.isSafeInteger(exactLocalRenderedTokens) || exactLocalRenderedTokens < 0 || exactLocalRenderedTokens + PROVIDER_PLAN.estimatedFraming > PROVIDER_PLAN.inputPerCall)
    throw new Error('Local token reservation exceeded; do not truncate or dispatch');
  return { wireHash: hash(payload), localRenderedTokens: exactLocalRenderedTokens, estimatedFraming: PROVIDER_PLAN.estimatedFraming,
    plannedTokens: exactLocalRenderedTokens + PROVIDER_PLAN.estimatedFraming, hostedCountGuaranteed: false };
}
export function dryRunSchedule() {
  return [1, 2, 3, 4].flatMap(batch => [1, 2].flatMap(repeat => PROVIDER_PLAN.caseIds.slice((batch - 1) * 4, batch * 4).flatMap((caseId, index) => {
    const variants = (repeat + index) % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate'];
    return variants.map(variant => ({ repeat, caseId, batch, turn: 1, variant, stages: ['generation', 'verification'], maxCalls: 2 }));
  })));
}
export function refuseProviderDispatch(): never { throw new Error('Proposal-only: provider dispatch is not implemented or authorized'); }
export function dispatchDeniedAdapters(): StructuredAdapters {
  return { generator: { id: 'groq-generation-dispatch-denied', kind: 'real-model', generate: async () => refuseProviderDispatch() },
    verifier: { id: 'groq-verification-dispatch-denied', kind: 'real-model', verify: async () => refuseProviderDispatch() },
    evidence: { revalidate: async original => structuredClone(original) } };
}
