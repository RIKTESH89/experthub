import { createHash } from 'crypto';

export const hash = (value: unknown): string => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export interface SourceDocument {
  id: string; group: string; personId: string; period: string; split: 'corpus' | 'heldout';
  publishedAt: string; audience: 'public' | 'premium'; chunks: { id: string; text: string }[];
}
export interface FrozenConfiguration {
  model: string; verifier: string; promptHash: string; settings: { temperature: number; seed: number };
  budget: { contextBytes: number; outputBytes: number; callsPerTurn: number; attempts: number; deadlineMs: number };
}
export interface Manifest {
  version: 'exp7-paired-offline-v1'; baselineCommit: string; datasetHash: string; implementationHash: string;
  cutoff: string; periods: { corpus: string[]; heldout: string[] }; documents: SourceDocument[];
  corpusChunkIds: string[]; variants: { id: 'baseline' | 'candidate'; configuration: FrozenConfiguration }[];
  repeats: number; providerAuthorization: 'NOT_AUTHORIZED'; humanReview: 'NOT_RUN';
}
const requireValue = (condition: unknown, message: string): void => { if (!condition) throw new Error(message); };
const unique = (values: string[]) => new Set(values).size === values.length;
/** Whole logical sources, publication periods and neighboring chunks are indivisible.
 * Evaluation-only documents may be shown to scorers, never retrieval/generation. */
export function validateManifest(manifest: Manifest): void {
  requireValue(manifest.version === 'exp7-paired-offline-v1', 'Unsupported manifest');
  requireValue(/^[a-f0-9]{40}$/.test(manifest.baselineCommit), 'Commit must be exact');
  for (const value of [manifest.datasetHash, manifest.implementationHash]) requireValue(/^[a-f0-9]{64}$/.test(value), 'Missing snapshot digest');
  requireValue(Number.isInteger(manifest.repeats) && manifest.repeats >= 2 && manifest.repeats <= 3, 'Two or three independent offline repeats required');
  requireValue(manifest.providerAuthorization === 'NOT_AUTHORIZED' && manifest.humanReview === 'NOT_RUN', 'Offline manifest cannot authorize provider/human results');
  requireValue(manifest.variants.length === 2 && unique(manifest.variants.map(v => v.id)) && manifest.variants.every(v => ['baseline', 'candidate'].includes(v.id)), 'Exactly two distinct variants required');
  requireValue(JSON.stringify(manifest.variants[0].configuration) === JSON.stringify(manifest.variants[1].configuration), 'Same model/prompt/settings/budget required');
  const configuration = manifest.variants[0].configuration;
  requireValue(configuration.model.startsWith('synthetic-') && configuration.verifier.startsWith('synthetic-'), 'Real providers forbidden');
  requireValue(/^[a-f0-9]{64}$/.test(configuration.promptHash), 'Prompt hash required');
  for (const value of Object.values(configuration.budget)) requireValue(Number.isInteger(value) && value > 0, 'Invalid budget');
  requireValue(configuration.budget.callsPerTurn <= 4 && configuration.budget.attempts <= 2 && configuration.budget.deadlineMs <= 30000, 'Native budget exceeded');
  requireValue(configuration.budget.contextBytes <= 200000 && configuration.budget.outputBytes <= 24000, 'Native byte budget exceeded');
  requireValue(Number.isFinite(Date.parse(manifest.cutoff)), 'Invalid cutoff');
  requireValue(unique(manifest.periods.corpus) && unique(manifest.periods.heldout) && !manifest.periods.corpus.some(p => manifest.periods.heldout.includes(p)), 'Period leakage');
  requireValue(manifest.documents.length > 0 && unique(manifest.documents.map(d => d.id)), 'Duplicate or missing source');
  const chunks = manifest.documents.flatMap(d => d.chunks.map(c => c.id));
  requireValue(unique(chunks) && unique(manifest.corpusChunkIds), 'Duplicate chunk');
  const groupSplits = new Map<string, string>();
  for (const source of manifest.documents) {
    requireValue(source.chunks.length > 0 && source.chunks.every(c => c.id && c.text.trim()), 'Empty source/chunk');
    requireValue(source.id && source.group && source.personId && ['corpus', 'heldout'].includes(source.split), 'Invalid source identity');
    const prior = groupSplits.get(source.group);
    requireValue(!prior || prior === source.split, 'Whole-source leakage'); groupSplits.set(source.group, source.split);
    requireValue(manifest.periods[source.split].includes(source.period), 'Period not frozen in source split');
    const published = Date.parse(source.publishedAt);
    requireValue(Number.isFinite(published) && (source.split === 'corpus' ? published <= Date.parse(manifest.cutoff) : published > Date.parse(manifest.cutoff)), 'Time leakage');
    if (source.split === 'corpus') requireValue(source.audience === 'public', 'Restricted corpus exposure');
    for (const chunk of source.chunks) requireValue(manifest.corpusChunkIds.includes(chunk.id) === (source.split === 'corpus'), 'Held-out or neighboring chunk leakage');
  }
  requireValue(manifest.corpusChunkIds.every(id => chunks.includes(id)), 'Unregistered corpus chunk');
}
export interface RetrievalObservation { selected: string[]; gold: string[]; forbidden: string[] }
export function retrievalMetrics(rows: RetrievalObservation[]) {
  for (const row of rows) {
    requireValue(unique(row.selected) && unique(row.gold), 'Duplicate retrieval IDs inflate denominators');
  }
  const selected = rows.reduce((n, r) => n + r.selected.length, 0), relevant = rows.reduce((n, r) => n + r.selected.filter(id => r.gold.includes(id)).length, 0), gold = rows.reduce((n, r) => n + r.gold.length, 0);
  return { selected, relevant, gold, precision: selected ? relevant / selected : null, recall: gold ? relevant / gold : null,
    forbiddenExposure: rows.reduce((n, r) => n + r.selected.filter(id => r.forbidden.includes(id)).length, 0),
    interpretation: 'Frozen exact-ID retrieval accounting only; not entailment. Empty gold has no recall denominator.' };
}
export interface ProviderRecord { latencyMs: number | null; inputTokens: number | null; outputTokens: number | null; dollarCost: number | null }
/** Missing billing/usage never means zero. Observed tokens are lower bounds when
 * any request lacks usage. This accepts saved records only; it dispatches nothing. */
export function providerAccounting(records: ProviderRecord[]) {
  requireValue(Array.isArray(records), 'Provider records must be an array');
  const fields = ['latencyMs', 'inputTokens', 'outputTokens', 'dollarCost'];
  for (const record of records) {
    requireValue(record && typeof record === 'object' && !Array.isArray(record) && Object.keys(record).length === fields.length && fields.every(key => Object.prototype.hasOwnProperty.call(record, key)), 'Provider measurement requires explicit numeric/null fields');
    for (const [key, value] of Object.entries(record)) requireValue(value === null || (Number.isFinite(value) && value >= 0 && (!key.endsWith('Tokens') || Number.isSafeInteger(value))), 'Invalid provider measurement');
  }
  const observed = (key: keyof ProviderRecord) => {
    const value = records.filter(r => r[key] !== null).reduce((total, r) => total + (r[key] as number), 0);
    requireValue(Number.isFinite(value) && (!key.endsWith('Tokens') || Number.isSafeInteger(value)), 'Provider aggregate overflow');
    return value;
  };
  const all = (key: keyof ProviderRecord) => records.length > 0 && records.every(r => r[key] !== null);
  const latencies = records.flatMap(r => r.latencyMs === null ? [] : [r.latencyMs]).sort((a, b) => a - b);
  return { requests: records.length, observedInputTokens: records.length ? observed('inputTokens') : null, observedOutputTokens: records.length ? observed('outputTokens') : null,
    completeUsage: all('inputTokens') && all('outputTokens'), unknownUsageRequests: records.filter(r => r.inputTokens === null || r.outputTokens === null).length,
    dollarCost: all('dollarCost') ? observed('dollarCost') : null, observedDollarCost: records.length ? observed('dollarCost') : null,
    medianLatencyMs: all('latencyMs') ? latencies[Math.floor(latencies.length / 2)] : null, p95LatencyMs: all('latencyMs') && latencies.length >= 20 ? latencies[Math.ceil(latencies.length * 0.95) - 1] : null,
    interpretation: 'Saved provider-record accounting only. Partial usage/cost are observed lower bounds; p95 withheld below 20 complete measurements. Actual billing needs a measured ledger, never inference from plan labels.' };
}
export function releaseMetrics(rows: { expectedAllowed: boolean; allowed: boolean }[]) {
  const tp = rows.filter(r => r.expectedAllowed && r.allowed).length, tn = rows.filter(r => !r.expectedAllowed && !r.allowed).length;
  const fp = rows.filter(r => !r.expectedAllowed && r.allowed).length, fn = rows.filter(r => r.expectedAllowed && !r.allowed).length;
  return { tp, tn, fp, fn, falsePositiveRate: fp + tn ? fp / (fp + tn) : null, falseNegativeRate: fn + tp ? fn / (fn + tp) : null,
    interpretation: 'Release-policy confusion against fixed synthetic expectations; not independent semantic verifier accuracy.' };
}
export const DIMENSIONS = ['faithfulness', 'style', 'naturalness', 'usefulness', 'abstention'] as const;
export type RatingDimension = typeof DIMENSIONS[number];
export interface HumanRating { reviewer: string; blindId: string; answerHash: string; dimension: RatingDimension; score: number | 'not-assessable'; evidence: string }
export interface ReviewAnswer { blindId: string; answerHash: string; text: string }
/** Partial or self-asserted annotations cannot turn blank human scores into a pass. */
export function aggregateHumanRatings(answers: ReviewAnswer[], ratings: HumanRating[]) {
  requireValue(answers.length > 0 && unique(answers.map(a => a.blindId)), 'Invalid answer inventory');
  const keys = new Set<string>(), reviewers = new Set<string>();
  for (const row of ratings) {
    const answer = answers.find(a => a.blindId === row.blindId);
    requireValue(answer && answer.answerHash === row.answerHash && hash(answer.text) === row.answerHash, 'Rating answer pin mismatch');
    requireValue(row.reviewer.trim() && DIMENSIONS.includes(row.dimension) && row.evidence.trim(), 'Rating requires reviewer/dimension/evidence');
    requireValue(row.score === 'not-assessable' || (Number.isInteger(row.score) && row.score >= 1 && row.score <= 5), 'Invalid rating scale');
    const key = JSON.stringify([row.reviewer, row.blindId, row.dimension]); requireValue(!keys.has(key), 'Duplicate rating'); keys.add(key); reviewers.add(row.reviewer);
  }
  const complete = reviewers.size >= 2 && Array.from(reviewers).every(reviewer => answers.every(a => DIMENSIONS.every(d => keys.has(JSON.stringify([reviewer, a.blindId, d])))));
  return { status: complete ? 'RECORDED_REQUIRES_ADJUDICATION' : 'NOT_RUN_OR_INCOMPLETE', reviewers: reviewers.size, annotationRows: ratings.length,
    dimensions: Object.fromEntries(DIMENSIONS.map(d => { const values = ratings.filter(r => r.dimension === d && typeof r.score === 'number').map(r => r.score as number); return [d, { mean: complete && values.length ? values.reduce((a, b) => a + b, 0) / values.length : null, rated: values.length, notAssessable: ratings.filter(r => r.dimension === d && r.score === 'not-assessable').length }]; })),
    interpretation: 'Recorded annotations require independent-rater provenance and disagreement adjudication; no automatic acceptance or personality claim.' };
}
