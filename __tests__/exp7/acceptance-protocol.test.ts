import { aggregateHumanRatings, DIMENSIONS, hash, providerAccounting, releaseMetrics, retrievalMetrics, validateManifest, type HumanRating, type ProviderRecord } from '../../scripts/exp7/protocol';
import { frozenManifest, implementationSnapshot, runOffline } from '../../scripts/exp7/runner';
import { readFileSync } from 'fs';
const original = process.env;
beforeEach(() => { process.env = { ...original, NODE_ENV: 'test', EXP15_EXP17_LOCAL_EVALUATION: '1' }; delete process.env.VERCEL; delete process.env.VERCEL_ENV; delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED; });
afterEach(() => { process.env = original; });

test('whole documents, neighboring chunks and periods are excluded at the frozen cutoff', () => {
  const m = frozenManifest(); expect(() => validateManifest(m)).not.toThrow();
  expect(m.documents.filter(d => d.split === 'heldout').flatMap(d => d.chunks.map(c => c.id)).every(id => !m.corpusChunkIds.includes(id))).toBe(true);
});
test.each(['neighbor', 'source-group', 'period', 'time', 'restricted', 'unregistered', 'duplicate'] as const)('rejects %s leakage before native adapter dispatch', kind => {
  const m = frozenManifest();
  if (kind === 'neighbor') m.corpusChunkIds.push('heldout-reason-1');
  if (kind === 'source-group') m.documents[2].group = m.documents[0].group;
  if (kind === 'period') m.periods.heldout.push('2020');
  if (kind === 'time') m.documents[0].publishedAt = '2026-08-01';
  if (kind === 'restricted') m.documents[0].audience = 'premium';
  if (kind === 'unregistered') m.corpusChunkIds.push('unregistered');
  if (kind === 'duplicate') m.documents[2].chunks[0].id = 'vector-a';
  expect(() => validateManifest(m)).toThrow();
});
test.each(['model', 'verifier', 'promptHash', 'settings', 'budget'] as const)('rejects unequal %s between variants', field => {
  const m = frozenManifest(), c = m.variants[1].configuration;
  if (field === 'settings') c.settings.temperature = 0.5;
  else if (field === 'budget') c.budget.outputBytes = 1024;
  else c[field] = 'changed';
  expect(() => validateManifest(m)).toThrow('Same model/prompt/settings/budget required');
});
test('cannot authorize a real model, unsupported repeat count or amplified native caps', () => {
  const m = frozenManifest(); m.variants.forEach(v => v.configuration.model = 'provider-model'); expect(() => validateManifest(m)).toThrow('Real providers forbidden');
  for (const repeats of [0, 1, 4, 2.1]) expect(() => validateManifest({ ...frozenManifest(), repeats })).toThrow();
  const large = frozenManifest(); large.variants.forEach(v => v.configuration.budget.outputBytes = 24001); expect(() => validateManifest(large)).toThrow('Native byte budget exceeded');
});
test('source content or frozen implementation drift is rejected', async () => {
  let m = frozenManifest(); m.documents[0].chunks[0].text += 'corruption'; await expect(runOffline(m)).rejects.toThrow('Frozen snapshot drift');
  m = frozenManifest(); m.implementationHash = 'f'.repeat(64); await expect(runOffline(m)).rejects.toThrow('Frozen snapshot drift');
});
test('integration review: new runtime gate helpers and their changed bytes invalidate implementation pin', () => {
  const injected = (file: string) => file === 'src/lib/ai/dialogue/structured/new-runtime-helper.ts' ? 'export const verdict = false;' : readFileSync(file, 'utf8') + (file === 'src/lib/ai/dialogue/structured/gate.ts' ? '\nimport { verdict } from "./new-runtime-helper";\nvoid verdict;' : '');
  const first = implementationSnapshot(injected);
  expect(first.some(([file]) => file.endsWith('new-runtime-helper.ts'))).toBe(true);
  const changed = implementationSnapshot(file => file.endsWith('new-runtime-helper.ts') ? 'export const verdict = true;' : injected(file));
  expect(hash(first)).not.toBe(hash(changed));
  const actual = implementationSnapshot();
  expect(actual.some(([file]) => file.endsWith('gate.ts'))).toBe(true);
  expect(actual.some(([file]) => file.endsWith('prompts.ts'))).toBe(true);
  expect(actual.some(([file]) => file === 'package-lock.json')).toBe(true);
  expect(actual.some(([file]) => file === 'scripts/exp7/run-local.ts')).toBe(true);
  expect(actual.some(([file]) => file === 'scripts/exp15-exp17/register-alias.cjs')).toBe(true);
  expect(hash(implementationSnapshot(file => readFileSync(file, 'utf8') + (file === 'scripts/exp7/run-local.ts' ? '\n// changed packet code' : '')))).not.toBe(hash(actual));
});
test('two fresh paired native executions save identical input/output/request traces without a quality score', async () => {
  const first = await runOffline(), second = await runOffline(first.manifest);
  expect(first.traces).toHaveLength(116); expect(first.summary.contractFailures).toEqual([]);
  expect(first.pairs.every(p => p.observations === 4 && p.sameInputs && p.sameOutputs)).toBe(true);
  const stable = (result: typeof first) => result.traces.map(({ localElapsedMs, ...trace }) => { void localElapsedMs; return trace; });
  expect(hash(stable(first))).toBe(hash(stable(second)));
  expect(first.summary.provider.status).toBe('NOT_RUN'); expect(first.summary.provider.requests).toBe(0);
  expect(Object.values(first.summary.measuredFidelity).every(v => v === null)).toBe(true);
  for (const trace of first.traces) {
    expect(JSON.stringify(trace.requests)).not.toMatch(/"expected"|"claimVerdict"|"humanRatings"|SYNTHETIC_PREMIUM_EXCEPTION|hindsight bias/);
    expect(trace.selectedChunkIds.every(id => first.manifest.corpusChunkIds.includes(id))).toBe(true);
  }
});
test('hosted runtime does not execute adapters or produce a false quality pass', async () => {
  process.env.VERCEL = '1'; const result = await runOffline();
  expect(result.traces.every(t => t.calls === 0 && t.requests.generation.length === 0)).toBe(true);
  expect(result.summary.contractFailures.length).toBeGreaterThan(0);
});
test('null retrieval denominators and duplicate-ID inflation stay explicit', () => {
  expect(retrievalMetrics([{ selected: [], gold: [], forbidden: [] }])).toMatchObject({ precision: null, recall: null });
  expect(retrievalMetrics([{ selected: ['a', 'restricted'], gold: ['a', 'b'], forbidden: ['restricted'] }])).toMatchObject({ precision: 0.5, recall: 0.5, forbiddenExposure: 1 });
  expect(() => retrievalMetrics([{ selected: ['a', 'a'], gold: ['a'], forbidden: [] }])).toThrow('Duplicate');
});
test('unsafe release and refusal overreach use separate denominators', () => {
  expect(releaseMetrics([{ expectedAllowed: true, allowed: false }, { expectedAllowed: false, allowed: true }, { expectedAllowed: false, allowed: false }])).toMatchObject({ tp: 0, tn: 1, fp: 1, fn: 1, falsePositiveRate: 0.5, falseNegativeRate: 1 });
  expect(releaseMetrics([])).toMatchObject({ falsePositiveRate: null, falseNegativeRate: null });
});
test('partial/unknown failed-request usage and billing cannot be silently reported complete', () => {
  expect(providerAccounting([])).toMatchObject({ dollarCost: null, observedInputTokens: null, medianLatencyMs: null });
  expect(providerAccounting([{ inputTokens: 10, outputTokens: 5, dollarCost: 0, latencyMs: 100 }, { inputTokens: null, outputTokens: null, dollarCost: null, latencyMs: null }])).toMatchObject({ observedInputTokens: 10, observedOutputTokens: 5, completeUsage: false, unknownUsageRequests: 1, dollarCost: null, medianLatencyMs: null });
  expect(providerAccounting([{ inputTokens: 10, outputTokens: 5, dollarCost: 0, latencyMs: 100 }])).toMatchObject({ completeUsage: true, dollarCost: 0, p95LatencyMs: null });
  expect(() => providerAccounting([{ inputTokens: -1, outputTokens: 1, dollarCost: null, latencyMs: 1 }])).toThrow();
});
test.each([{}, { latencyMs: 100 }, { latencyMs: 100, inputTokens: undefined, outputTokens: 1, dollarCost: 0 }, { latencyMs: 100, inputTokens: 1, outputTokens: 1, dollarCost: 0, extra: 1 }, null, []])('independent review rejects malformed provider accounting record %p', record => {
  expect(() => providerAccounting([record] as ProviderRecord[])).toThrow();
});
test('independent review rejects a non-array provider ledger', () => {
  expect(() => providerAccounting({} as ProviderRecord[])).toThrow('array');
});
test('provider measurement and aggregate overflow cannot create complete usage or billing', () => {
  expect(() => providerAccounting([{ latencyMs: 1, inputTokens: 1e100, outputTokens: 1, dollarCost: 0 }])).toThrow('measurement');
  expect(() => providerAccounting([1, 2].map(() => ({ latencyMs: 1, inputTokens: Number.MAX_SAFE_INTEGER, outputTokens: 1, dollarCost: 0 })))).toThrow('overflow');
  expect(() => providerAccounting([1, 2].map(() => ({ latencyMs: 1, inputTokens: 1, outputTokens: 1, dollarCost: 1e308 })))).toThrow('overflow');
});
const answers = [{ blindId: 'B1', text: 'An answer.', answerHash: hash('An answer.') }];
function ratings(): HumanRating[] { return ['independent-rater-a', 'independent-rater-b'].flatMap(reviewer => DIMENSIONS.map(dimension => ({ reviewer, blindId: 'B1', answerHash: answers[0].answerHash, dimension, score: dimension === 'style' ? 'not-assessable' as const : 4, evidence: 'Exact span and reference checked; source style insufficient.' }))); }
test('blank and partial human rating forms cannot create human quality numbers', () => {
  expect(aggregateHumanRatings(answers, []).status).toBe('NOT_RUN_OR_INCOMPLETE');
  expect(Object.values(aggregateHumanRatings(answers, ratings().slice(0, 5)).dimensions).every(d => d.mean === null)).toBe(true);
});
test('complete recorded ratings still require adjudication and preserve not-assessable', () => {
  expect(aggregateHumanRatings(answers, ratings())).toMatchObject({ status: 'RECORDED_REQUIRES_ADJUDICATION', dimensions: { style: { mean: null, notAssessable: 2 }, faithfulness: { mean: 4 } } });
});
test.each(['duplicate', 'pin', 'scale', 'evidence', 'reviewer'] as const)('rejects malformed %s human annotation', kind => {
  const rows = ratings();
  if (kind === 'duplicate') rows.push(rows[0]);
  if (kind === 'pin') rows[0].answerHash = hash('Different answer');
  if (kind === 'scale') rows[0].score = 6;
  if (kind === 'evidence') rows[0].evidence = '';
  if (kind === 'reviewer') rows[0].reviewer = '';
  expect(() => aggregateHumanRatings(answers, rows)).toThrow();
});
