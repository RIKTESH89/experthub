/* Independent pure-selector review. Reads EXP-14 checkout; writes only own audit. */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS entry loads TypeScript through the preloaded ts-node review bootstrap. */
const { writeFileSync } = require('node:fs');
const target = require('node:path').resolve(process.env.EXP_REVIEW_TARGET_ROOT || require('node:path').join(__dirname, '../..'));
const { assembleBundle } = require(target + '/src/lib/retrieval/bundle.ts');
const { planQuestion } = require(target + '/src/lib/retrieval/intent.ts');
const { TEMPORAL_READ_VERSION, TEMPORAL_SELECTION_VERSION } = require(target + '/src/lib/graph/temporal/read-policy.ts');
const at = new Date('2026-10-11');
const row = (id, extra = {}) => ({ id, spanId: 'span-' + id, revisionId: 'revision-' + id, itemId: 'item-' + id, contentHash: 'synthetic', sourceVersion: 1, authorId: 'owner', uploaderId: 'owner', speakerId: 'owner', speakerRole: 'author', audience: 'public', text: 'I prefer ArrowBus.', start: 0, end: 20, chunkIds: ['chunk-' + id], kind: 'explicit', endorsedByOwner: true, subject: 'owner', predicate: 'prefer', object: 'ArrowBus', assertionId: 'assertion-' + id, weight: 1, ingestedAt: at, speaker: 'owner', origin: 'author', domain: 'transport', context: 'small teams', category: 'preference', polarity: 'positive', action: 'ArrowBus', validFrom: null, validUntil: null, recordedAt: at, certainty: 'explicit', situation: 'small teams', constraints: null, documentedReasons: null, alternatives: null, tradeoffs: null, exceptions: null, ...extra });
function select(stances, assertions = [], relations = [], question = 'Should I choose ArrowBus?', version = TEMPORAL_SELECTION_VERSION, allowed) {
    const ids = [...stances, ...assertions].flatMap(r => r.chunkIds);
    const scope = { expertProfileId: 'tenant', namespace: 'review', isOwner: false, allowedVectorIds: allowed || ids };
    return assembleBundle(scope, planQuestion(question, { mode: 'current', now: at }), ids.map(vectorId => ({ content: '', score: .9, metadata: { vectorId, expertProfileId: 'tenant' } })), assertions, { mode: 'current', validAt: at.toISOString(), knownAt: null, readVersion: version, stances, supersededStances: [], relations });
}
const relation = (from, to, type) => ({ from, to, type, kind: 'explicit', evidenceSpanIds: ['span-' + from, 'span-' + to], uncertainty: null });
const late = row('late', { text: Array.from({ length: 70 }, (_, i) => 'filler' + String.fromCharCode(97 + i % 26)).join(' ') + ' NacreQueue.' });
const lateResult = select([], [late], [], 'What is NacreQueue?');
const v2Control = select([], [late], [], 'What is NacreQueue?', TEMPORAL_READ_VERSION);
const crowded = select([row('a', { constraints: 'ArrowBus', exceptions: 'ArrowBus' }), row('b'), row('z', { polarity: 'negative', action: 'OtherBus', domain: 'other', context: '', situation: '', text: 'I oppose ArrowBus.' })], [], [relation('a', 'b', 'supersedes'), relation('a', 'z', 'contradiction')]);
const oversized = select([row('a'), row('z', { polarity: 'negative', text: 'I oppose ArrowBus. ' + 'details '.repeat(500) })], [], [relation('a', 'z', 'contradiction')]);
const revoked = select([row('a'), row('z', { polarity: 'negative', text: 'PRIVATE_REVIEW_SENTINEL' })], [], [relation('a', 'z', 'contradiction')], 'Should I choose ArrowBus?', TEMPORAL_SELECTION_VERSION, ['chunk-a']);
const promptOrder = crowded.prompt.split('\n').flatMap(line => { try { const parsed = JSON.parse(line); return parsed.type === 'stance' ? [parsed.id] : []; } catch { return []; } });
const contraryIndex = promptOrder.indexOf('z'), otherIndex = promptOrder.indexOf('b');
const results = { target, reviewedCommit: require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: target, encoding: 'utf8' }).trim(), temporalSelectionVersion: TEMPORAL_SELECTION_VERSION, assertions: { lateRareKeywordSelected: lateResult.evidenceTrace.some(r => r.spanId === 'span-late'), v2FrozenLateAnchorControl: v2Control.evidenceTrace.length === 0, contradictionBeforeOtherNeighbor: contraryIndex >= 0 && (otherIndex < 0 || contraryIndex < otherIndex), oversizedConflictVisible: oversized.gaps.some(g => /conflict|disagree/i.test(g)), revokedCounterevidenceNotReturned: !JSON.stringify(revoked).includes('PRIVATE_REVIEW_SENTINEL') }, crowded: { selected: crowded.temporalTrace.stances.map(r => r.id), promptOrder, relations: crowded.temporalTrace.relations }, oversized: { selected: oversized.temporalTrace.stances.map(r => r.id), gaps: oversized.gaps, trace: oversized.trace }, limit: 'Pure synthetic selector review; no database/provider calls or human quality assessment.' };
writeFileSync('audit/exp17-acceptance-20261011/exp14-independent-review.json', JSON.stringify(results, null, 2) + '\n');
process.stdout.write(JSON.stringify(results.assertions) + '\n');
