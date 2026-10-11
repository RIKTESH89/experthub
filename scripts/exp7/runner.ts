import { readFileSync } from 'fs';
import { posix } from 'path';
import { performance } from 'perf_hooks';
import { runStructuredDialogue } from '../../src/lib/ai/dialogue/structured/pipeline';
import { GENERATION_INSTRUCTIONS, VERIFICATION_INSTRUCTIONS } from '../../src/lib/ai/dialogue/structured/prompts';
import { fixtureAdapters } from '../exp15-exp17/runner';
import type { GenerationRequest, VerificationRequest } from '../../src/lib/ai/dialogue/structured/contracts';
import type { HistoryMessage } from '../../src/lib/ai/history';
import { documents, evaluationCases } from './fixtures';
import { aggregateHumanRatings, hash, releaseMetrics, retrievalMetrics, validateManifest, type Manifest, type ReviewAnswer } from './protocol';

/** Traverse static local runtime imports from controlled offline entrypoints so
 * a newly introduced gate helper cannot escape the frozen implementation pin.
 * Imported type-only modules have no runtime behavior. External dependencies
 * are represented by the checked-in lockfile; no packages are installed/read. */
export function implementationSnapshot(read = (file: string) => readFileSync(file, 'utf8')): [string, string][] {
  const visited = new Map<string, string>(), pending = ['scripts/exp7/runner.ts', 'scripts/exp7/run-local.ts', 'scripts/exp7/import-ratings.ts', 'scripts/exp15-exp17/register-alias.cjs', 'package-lock.json'];
  while (pending.length) {
    const file = pending.pop()!;
    if (visited.has(file)) continue;
    if (!/^(src|scripts)\//.test(file) && file !== 'package-lock.json') throw new Error('Dependency escaped controlled roots');
    const content = read(file); visited.set(file, hash(content));
    if (visited.size > 100) throw new Error('Offline dependency graph exceeds frozen bound');
    if (file === 'package-lock.json') continue;
    const imports = Array.from(content.matchAll(/\bimport\s+(?!type\b)(?:[^;]+?\s+from\s*)?["']([^"']+)["']/g)).map(m => m[1]);
    for (const specifier of imports) {
      const local = specifier.startsWith('@/') ? `src/${specifier.slice(2)}` : specifier.startsWith('.') ? posix.normalize(posix.join(posix.dirname(file), specifier)) : null;
      if (local) pending.push(/\.(ts|tsx|cjs|js)$/.test(local) ? local : `${local}.ts`);
    }
  }
  return Array.from(visited.entries()).sort(([a], [b]) => a.localeCompare(b));
}
export function frozenManifest(): Manifest {
  const configuration = { model: 'synthetic-generator-fixture-v1', verifier: 'synthetic-independent-review-fixture-v1', promptHash: hash([GENERATION_INSTRUCTIONS, VERIFICATION_INSTRUCTIONS]), settings: { temperature: 0, seed: 7 }, budget: { contextBytes: 200000, outputBytes: 24000, callsPerTurn: 4, attempts: 2, deadlineMs: 2000 } };
  return { version: 'exp7-paired-offline-v1', baselineCommit: '0a2cd602646d7ae5689b195a4fbe6da05a5daa28', implementationHash: hash(implementationSnapshot()), datasetHash: hash(evaluationCases()), cutoff: '2025-12-31T23:59:59.999Z', periods: { corpus: ['2020'], heldout: ['2026-H2'] }, documents: documents(), corpusChunkIds: ['vector-a', 'vector-b'], variants: [{ id: 'baseline', configuration: structuredClone(configuration) }, { id: 'candidate', configuration: structuredClone(configuration) }], repeats: 2, providerAuthorization: 'NOT_AUTHORIZED', humanReview: 'NOT_RUN' };
}
export interface Trace {
  repeat: number; variant: string; caseId: string; turn: number; inputHash: string; outputHash: string;
  query: string; history: HistoryMessage[];
  expected: string; outcome: string; answer: string; reasons: string[]; calls: number; attempts: number;
  selectedChunkIds: string[]; goldChunkIds: string[]; acceptedSpanIds: string[];
  localElapsedMs: number; requests: { generation: unknown[]; verification: unknown[] };
}
export async function runOffline(manifest: Manifest = frozenManifest()) {
  validateManifest(manifest);
  const current = frozenManifest();
  if (current.datasetHash !== manifest.datasetHash || current.implementationHash !== manifest.implementationHash || hash(current.documents) !== hash(manifest.documents)) throw new Error('Frozen snapshot drift');
  const corpus = new Set(manifest.corpusChunkIds), forbidden = manifest.documents.filter(d => d.split === 'heldout').flatMap(d => d.chunks.map(c => c.id));
  const traces: Trace[] = [], started = performance.now();
  for (let repeat = 1; repeat <= manifest.repeats; repeat++) {
    for (const scenario of evaluationCases()) {
      // Alternate order across cases/repeats; both variants run the current native
      // kernel with the SAME fixed synthetic adapters. This is protocol parity,
      // never a measured old-versus-new architecture or provider comparison.
      const order = (parseInt(hash(scenario.id).slice(0, 2), 16) + repeat) % 2 ? [...manifest.variants].reverse() : manifest.variants;
      for (const variant of order) {
        const history: HistoryMessage[] = structuredClone(scenario.history);
        for (let turnIndex = 0; turnIndex < scenario.turns.length; turnIndex++) {
          if (performance.now() - started > 30000) throw new Error('Terminal offline run deadline');
          const turn = scenario.turns[turnIndex], bundle = structuredClone(scenario.bundle);
          if (bundle.sources.some(s => !corpus.has(s.metadata.vectorId as string)) || [...bundle.evidenceTrace, ...bundle.temporalTrace.stances, ...bundle.temporalTrace.supersededStances].some(r => r.chunkIds.some(id => !corpus.has(id)))) throw new Error('Provider context contains excluded source/chunk');
          const inputHash = hash({ expertId: scenario.expertId, query: turn.query, history, bundle, configuration: variant.configuration });
          const seen = { generation: [] as GenerationRequest[], verification: [] as VerificationRequest[] }, adapters = fixtureAdapters(turn, seen);
          const generate = adapters.generator.generate, verify = adapters.verifier.verify;
          adapters.generator.generate = async request => {
            if (Buffer.byteLength(JSON.stringify(request), 'utf8') > variant.configuration.budget.contextBytes) throw new Error('Offline context byte budget exceeded');
            const value = await generate(request);
            if (Buffer.byteLength((value as { text: string }).text, 'utf8') > variant.configuration.budget.outputBytes) throw new Error('Offline output byte budget exceeded');
            return value;
          };
          adapters.verifier.verify = async request => {
            if (Buffer.byteLength(JSON.stringify(request), 'utf8') > variant.configuration.budget.contextBytes) throw new Error('Offline verification byte budget exceeded');
            return verify(request);
          };
          const at = performance.now();
          const result = await runStructuredDialogue({ expertId: scenario.expertId, query: turn.query, history, bundle, adapters, deadlineMs: variant.configuration.budget.deadlineMs });
          if (result.providerCalls > variant.configuration.budget.callsPerTurn || result.attempts > variant.configuration.budget.attempts) throw new Error('Terminal adapter budget breach');
          const semanticOutput = { outcome: result.outcome, answer: result.text, reasons: result.decision.reasons, accepted: result.decision.acceptedSpanIds, calls: result.providerCalls, attempts: result.attempts };
          const selectedChunkIds = bundle.sources.map(s => s.metadata.vectorId as string);
          const goldChunkIds = turn.expected === 'blocked' || !turn.draft.claims.some(c => c.evidence.length) ? [] : Array.from(new Set(turn.draft.claims.flatMap(c => c.evidence).flatMap(ref => [...bundle.evidenceTrace, ...bundle.temporalTrace.stances].filter(r => r.spanId === ref.spanId).flatMap(r => r.chunkIds))));
          traces.push({ repeat, variant: variant.id, caseId: scenario.id, turn: turnIndex + 1, query: turn.query, history: structuredClone(history), inputHash, outputHash: hash(semanticOutput), expected: turn.expected, ...semanticOutput, acceptedSpanIds: result.decision.acceptedSpanIds, selectedChunkIds, goldChunkIds, localElapsedMs: performance.now() - at, requests: seen });
          history.push({ role: 'user', content: turn.query }, { role: 'assistant', content: result.text });
        }
      }
    }
  }
  const keys = Array.from(new Set(traces.map(t => `${t.caseId}:${t.turn}`)));
  const pairs = keys.map(key => { const rows = traces.filter(t => `${t.caseId}:${t.turn}` === key); return { key, observations: rows.length, sameInputs: new Set(rows.map(t => t.inputHash)).size === 1, sameOutputs: new Set(rows.map(t => t.outputHash)).size === 1 }; });
  const firstRepeat = traces.filter(t => t.repeat === 1);
  const answers: ReviewAnswer[] = firstRepeat.map((t, i) => ({ blindId: `B${String(i + 1).padStart(3, '0')}`, answerHash: hash(t.answer), text: t.answer }));
  const times = traces.map(t => t.localElapsedMs).sort((a, b) => a - b);
  const contextAccounting = retrievalMetrics(traces.map(t => ({ selected: t.selectedChunkIds, gold: t.goldChunkIds, forbidden })));
  return { manifest, traces, pairs, answers, summary: { mode: 'native-pipeline-synthetic-protocol-parity', traces: traces.length, cases: evaluationCases().length, turnsPerVariant: keys.length, repeats: manifest.repeats, sameInputPairs: pairs.filter(p => p.sameInputs).length, repeatableOutputPairs: pairs.filter(p => p.sameOutputs).length, contractFailures: traces.filter(t => t.expected !== t.outcome).map(t => ({ caseId: t.caseId, turn: t.turn, variant: t.variant, repeat: t.repeat, reasons: t.reasons })), releasePolicy: releaseMetrics(traces.map(t => ({ expectedAllowed: t.expected === 'released-synthetic-evaluation', allowed: t.outcome === 'released-synthetic-evaluation' }))), suppliedEvidence: { selected: contextAccounting.selected, goldMatched: contextAccounting.relevant, gold: contextAccounting.gold, forbiddenExposure: contextAccounting.forbiddenExposure, interpretation: 'Preassembled context accounting only; no native retrieval call occurred' }, nativeRetrieval: { status: 'NOT_RUN', precision: null, recall: null }, human: aggregateHumanRatings(answers, []), measuredFidelity: { supportedClaimRate: null, unsupportedPersonClaims: null, abstentionQuality: null, naturalness: null, style: null }, provider: { status: 'NOT_RUN', requests: 0, inputTokens: null, outputTokens: null, dollarCost: null, latencyMs: null, firstTokenMs: null }, localLatency: { medianMs: times[Math.floor(times.length / 2)], p95Ms: times[Math.ceil(times.length * 0.95) - 1], scope: 'In-process synthetic native pipeline across heterogeneous fixtures; not service/provider latency or production percentile' }, comparison: 'Both labels use the same current native kernel and fixed adapters; no architecture gain is measured', interpretation: 'Repeated native adapter execution demonstrates harness/contract determinism only. Gold/review fixtures supply outcomes; neither independent semantic accuracy nor human quality is measured. Supplied-evidence IDs are preassembled context accounting, not native retrieval precision/recall.' } };
}
