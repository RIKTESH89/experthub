/* eslint-disable @typescript-eslint/no-require-imports -- Local CommonJS runner imports native TypeScript through preloaded ts-node only. */
const { readFileSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
let prohibitedNetworkAttempts = 0;
globalThis.fetch = async () => { prohibitedNetworkAttempts++; throw new Error('Network dispatch is prohibited in this fixture'); };
const integration = '/Users/rikteshs20/Documents/Codex/2026-10-11/task-5/integration';
const owned = '/Users/rikteshs20/Documents/Codex/2026-10-11/task-5/workers/exp-17';
const target = process.env.EXP17_NATIVE_STRESS_TARGET || integration;
if (![integration, owned].includes(target)) throw new Error('Unapproved native fixture target');
const phase = process.env.EXP17_NATIVE_STRESS_PHASE || 'pre-repair';
if (!['pre-repair', 'post-repair'].includes(phase)) throw new Error('Invalid stress phase');
const { runStructuredDialogue } = require(target + '/src/lib/ai/dialogue/structured/pipeline.ts');
const { planQuestion } = require(target + '/src/lib/retrieval/intent.ts');
const { STRUCTURED_VERSION } = require(target + '/src/lib/ai/dialogue/structured/contracts.ts');
const directory = 'audit/exp17-human-authoring-20261011';
const inputs = JSON.parse(readFileSync(directory + '/developer-seed-inputs.json', 'utf8'));
const candidates = JSON.parse(readFileSync(directory + '/private-fixed-candidate-profiles.json', 'utf8')).candidates;
const expected = JSON.parse(readFileSync(directory + '/private-developer-expectations.json', 'utf8')).cases;
function reference(row) { return { spanId: row.spanId, revisionId: row.revisionId, contentHash: row.contentHash, sourceVersion: row.sourceVersion }; }
function nativeBundle(task) {
    const declared = task.sourceIds.map(id => inputs.sources.find(s => s.sourceId === id));
    // Map only native evidence fields. Future access events, designer notes and
    // private expectations must never enter generation/verifier source context.
    const rows = declared.map(source => ({ ...reference(source), itemId: source.itemId, authorId: source.authorId, uploaderId: source.uploaderId, speakerId: source.speakerId, speakerRole: source.speakerRole, endorsedByOwner: source.endorsedByOwner, audience: source.audience, text: source.text, start: source.start, end: source.end, chunkIds: source.chunkIds, predicate: source.predicate, object: source.object, assertionId: 'assertion-' + source.sourceId, subject: task.representedPersonId, ingestedAt: new Date(source.recordedAt), sourceUpdatedAt: new Date(source.recordedAt), publishedAt: source.publishedAt ? new Date(source.publishedAt) : null, publicationTimeBasis: source.publicationTimeBasis, kind: 'explicit', weight: 1, extractorVersion: 'authoring-synthetic-literal-v1' }));
    const temporal = task.frame.mode === 'as-of' ? { mode: 'as-of', validAt: new Date(task.frame.at) } : { mode: 'current', now: new Date(task.evaluationClock) };
    const stances = rows.flatMap((row, index) => { const source = declared[index]; return source.temporalStance ? [{ ...row, id: 'stance-' + source.sourceId, speaker: row.speakerId, origin: 'author', domain: 'mapping', context: null, category: 'preference', polarity: source.polarity, action: row.object, validFrom: source.validFrom ? new Date(source.validFrom) : null, validUntil: source.validUntil ? new Date(source.validUntil) : null, recordedAt: row.ingestedAt, supersedes: null, certainty: 'explicit', situation: null, constraints: source.constraints, exceptions: source.exceptions, documentedReasons: source.documentedReasons, chosenAction: row.object, alternatives: null, tradeoffs: null, decisionType: null }] : []; });
    return { version: 'intent-evidence-v1', plan: planQuestion(task.query, temporal), evidenceTrace: rows, temporalTrace: { mode: temporal.mode, validAt: (temporal.validAt || temporal.now).toISOString(), knownAt: null, stances, supersededStances: [], relations: task.relations.map(relation => ({ from: 'stance-' + relation.fromSource, to: 'stance-' + relation.toSource, type: relation.type, kind: 'explicit', evidenceSpanIds: ['span-' + relation.fromSource, 'span-' + relation.toSource], uncertainty: 'Unresolved declared conflict' })), coverage: 'synthetic declared seed only' }, sources: rows.map((row, index) => ({ content: row.text, score: 1, metadata: { vectorId: row.chunkIds[0], expertProfileId: 'profile-seed-17', title: declared[index].title, knowledgeItemId: row.itemId, sourceType: declared[index].sourceType, sourceId: declared[index].sourceId, sourceVersion: row.sourceVersion } })), prompt: 'Synthetic authorized source data: ' + JSON.stringify(rows), gaps: ['Undocumented motives, experiences and validity remain unknown'], trace: { candidates: rows.length, selected: rows.length, tokenUpperBound: 1024, hops: 0, truncated: false, retrievalMs: 0, failures: [] } };
}
async function main() {
    const head = execFileSync('git', ['-C', target, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (head !== (process.env.EXP17_NATIVE_STRESS_HEAD || '43b784a4e71fc985ae178e1d7ab764f0ff4a85d1')) throw new Error('Native kernel changed; explicitly pin and review a new head before reusing this stress run');
    const traces = [];
    for (const task of inputs.cases) {
        const profile = candidates.find(candidate => candidate.id === task.id);
        const bundle = nativeBundle(task), evidence = bundle.evidenceTrace.map(reference);
        const claims = [{ id: 'fixed-claim-' + task.id, start: 0, end: profile.text.length, category: profile.category, presentation: profile.presentation, evidence, frame: task.frame, ...(['person-belief', 'person-biography'].includes(profile.category) ? { personId: task.representedPersonId } : {}) }];
        const draft = { version: STRUCTURED_VERSION, text: profile.text, claims };
        // Freeze reviewer observations independently before invoking the pipeline.
        // This permissive fixed reviewer is explicitly NOT semantic/model validation.
        const observed = { id: claims[0].id, start: 0, end: profile.text.length, observedCategory: profile.observedCategory, observedPresentation: profile.presentation, ...(['person-belief', 'person-biography'].includes(profile.observedCategory) ? { observedPersonId: task.representedPersonId } : {}), verdict: profile.verdict, supportedEvidence: structuredClone(evidence), reason: 'Separately frozen synthetic observation; source truth and human gold unvalidated' };
        let reads = 0;
        const adapters = {
            generator: { id: 'human-seed-fixed-generator-v1', kind: 'synthetic', generate: async request => {
                if (/permittedAtDelivery|permittedAtRetrieval|provenanceNote|developerSemanticExpectation|pipelineContractExpectation|deliveryEvent/.test(JSON.stringify(request.context))) throw new Error('Seed control metadata leaked into native adapter context');
                return structuredClone(draft);
            } },
            verifier: { id: 'human-seed-fixed-reviewer-v1', kind: 'synthetic', verify: async request => {
                if (request.draft.text !== profile.text) throw new Error('Unexpected draft; fixed reviewer does not follow altered generator labels');
                return { version: STRUCTURED_VERSION, draftDigest: request.draftDigest, evidenceDigest: request.evidenceDigest, stateDigest: request.stateDigest, completeClaimCoverage: true, relevant: true, constraintsSatisfied: true, identity: 'safe-ai', calibration: 'appropriate', highStakes: 'not-applicable', claims: [structuredClone(observed)] };
            } },
            evidence: { revalidate: async original => {
                reads++;
                const fresh = structuredClone(original);
                if ((task.deliveryEvent === 'revoke-after-semantic-review' && reads >= 2) || task.deliveryEvent === 'version-change-before-semantic-review') { fresh.evidenceTrace = []; fresh.temporalTrace.stances = []; fresh.sources = []; }
                return fresh;
            } },
        };
        const result = await runStructuredDialogue({ expertId: task.representedPersonId, query: task.query, history: task.history, bundle, adapters, maxAttempts: 1, deadlineMs: 500 });
        const key = expected.find(entry => entry.id === task.id);
        const contractExpected = phase === 'pre-repair' ? key.pipelineContractExpectationBeforeRepair : key.pipelineContractExpectationAfterRepair;
        traces.push({ id: task.id, kernelHead: head, outcome: result.outcome, reasons: result.decision.reasons, acceptedSpanIds: result.decision.acceptedSpanIds, attempts: result.attempts, syntheticAdapterInvocations: result.providerCalls, permissionReads: reads, pipelineContractExpectation: contractExpected, contractAgreement: result.outcome === contractExpected, developerSemanticExpectation: key.expectation, originalDraft: profile.text, deliveredText: result.text, evidencePins: evidence, humanRating: null, semanticModelRating: null });
    }
    const runtimePaths = ['src/lib/ai/dialogue/structured/pipeline.ts', 'src/lib/ai/dialogue/structured/gate.ts', 'src/lib/ai/dialogue/structured/literal-support.ts', 'src/lib/ai/dialogue/state.ts', 'src/lib/retrieval/intent.ts'];
    const runtimeHashes = Object.fromEntries(runtimePaths.map(path => [path, createHash('sha256').update(readFileSync(target + '/' + path)).digest('hex')]));
    const report = { mode: 'native-pipeline-fixed-adapter-stress', phase, kernelTarget: target, kernelHead: head, runtimeHashes, literalGuardSha256: runtimeHashes[runtimePaths[2]], caseCount: traces.length, realProviderCalls: 0, prohibitedNetworkAttempts, actualNativeStoreAccess: false, humanAuthoringStatus: 'NOT_RUN', semanticAssessment: 'UNMEASURED', inputsSha256: createHash('sha256').update(readFileSync(directory + '/developer-seed-inputs.json')).digest('hex'), traces, stressFindings: traces.filter(trace => ['unsupported-person-experience', 'likely-safe-general-explanation', 'likely-faithful-paraphrase-safe-refusal-risk'].includes(trace.developerSemanticExpectation)).map(trace => ({ id: trace.id, developerSemanticExpectation: trace.developerSemanticExpectation, nativeOutcome: trace.outcome, interpretation: 'Review finding against declared fixture expectation; not a measured semantic error rate' })) };
    writeFileSync(directory + '/private-native-stress-' + phase + '.json', JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ kernelHead: head, cases: traces.length, contractMismatches: traces.filter(trace => !trace.contractAgreement).map(trace => ({ id: trace.id, outcome: trace.outcome, reasons: trace.reasons })), realProviderCalls: 0, semanticAssessment: 'UNMEASURED' }) + '\n');
}
main().catch(error => { process.stderr.write(String(error) + '\n'); process.exitCode = 1; });
