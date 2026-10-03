import { runStructuredDialogue } from '@/lib/ai/dialogue/structured/pipeline';
import { type VerificationRequest } from '@/lib/ai/dialogue/structured/contracts';
import { baseBundle, draft, reference, heldoutConversations } from '../../scripts/exp15-exp17/fixtures';
import { fixtureAdapters } from '../../scripts/exp15-exp17/runner';
const saved = process.env;
beforeEach(() => { process.env = { ...saved, NODE_ENV: 'test', EXP15_EXP17_LOCAL_EVALUATION: '1' }; delete process.env.VERCEL; delete process.env.VERCEL_ENV; delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED; });
afterEach(() => { process.env = saved; });
test('a draft cannot change after approving verification while final source reads are pending', async () => {
    const provider = fixtureAdapters({ query: 'Explain recursion', draft: draft('A base case stops recursion.'), expected: 'released-synthetic-evaluation', dimensions: [] }, { generation: [], verification: [] });
    let captured: VerificationRequest | undefined, checks = 0;
    const verify = provider.verifier.verify;
    provider.verifier.verify = async (request) => { captured = request; return verify(request); };
    provider.evidence.revalidate = async (original) => { checks++; if (checks === 2)
        captured!.draft.text = 'The expert is a licensed clinician.'; return structuredClone(original); };
    const result = await runStructuredDialogue({ expertId: 'expert-synthetic', query: 'Explain recursion', history: [], bundle: baseBundle(), adapters: provider });
    expect(result.outcome).toBe('blocked');
    expect(result.text).not.toContain('licensed clinician');
});
test('live pins cannot invent a validity start absent from the immutable original stance', async () => {
    const bundle = baseBundle();
    const row = bundle.evidenceTrace[0];
    bundle.temporalTrace.stances = [{ ...row, id: 'stance-a', speaker: 'expert-synthetic', origin: 'author', domain: 'research', context: null, category: 'preference', polarity: 'positive', action: 'preregistered protocols', validFrom: null, validUntil: null, recordedAt: new Date('2020-01-01'), supersedes: null, certainty: 'explicit', situation: null, constraints: null, chosenAction: null, documentedReasons: null, alternatives: null, tradeoffs: null, exceptions: null, decisionType: null }] as unknown as typeof bundle.temporalTrace.stances;
    const answer = draft('The expert currently prefers preregistered protocols.', 'person-belief', { personId: 'expert-synthetic', evidence: [reference], frame: { mode: 'current' } });
    const provider = fixtureAdapters({ query: 'What is their current preference?', draft: answer, expected: 'blocked', dimensions: [] }, { generation: [], verification: [] });
    provider.evidence.revalidate = async (original) => ({ ...structuredClone(original), temporalTrace: { ...structuredClone(original.temporalTrace), stances: original.temporalTrace.stances.map(s => ({ ...s, validFrom: new Date('2019-01-01') })) } });
    const result = await runStructuredDialogue({ expertId: 'expert-synthetic', query: 'What is their current preference?', history: [], bundle, adapters: provider });
    expect(result.outcome).toBe('blocked');
});
test('all accepted current-user constraints reach both generation and independent verification', async () => {
    const query = 'Explain recursion. ' + 'background '.repeat(220) + ' CRITICAL_FINAL_CONSTRAINT: include limitations and no investment advice.';
    const seen = { generation: [] as import("@/lib/ai/dialogue/structured/contracts").GenerationRequest[], verification: [] as VerificationRequest[] };
    const provider = fixtureAdapters({ query, draft: draft('A base case stops recursion.'), expected: 'released-synthetic-evaluation', dimensions: [] }, seen);
    await runStructuredDialogue({ expertId: 'expert-synthetic', query, history: [], bundle: baseBundle(query), adapters: provider });
    expect(JSON.stringify(seen.generation[0].context)).toContain('CRITICAL_FINAL_CONSTRAINT');
    expect(JSON.stringify(seen.verification[0].context)).toContain('CRITICAL_FINAL_CONSTRAINT');
});
function currentBundle() {
    const bundle = baseBundle();
    const sample = heldoutConversations().find(c => c.id === 'H18-historical-validity')!.bundle.temporalTrace.stances[0];
    bundle.temporalTrace.stances = [{ ...structuredClone(sample), validUntil: null }];
    return bundle;
}
function currentProvider(bundle = currentBundle()) {
    const response = draft('The expert currently prefers preregistered protocols.', 'person-belief', { personId: 'expert-synthetic', evidence: [reference], frame: { mode: 'current' } });
    return { bundle, provider: fixtureAdapters({ query: 'What is the current preference?', draft: response, expected: 'released-synthetic-evaluation', dimensions: [] }, { generation: [], verification: [] }) };
}
async function runCurrent(provider: ReturnType<typeof fixtureAdapters>, bundle = currentBundle()) {
    return runStructuredDialogue({ expertId: 'expert-synthetic', query: 'What is the current preference?', history: [], bundle, adapters: provider });
}
test.each([
    ['validFrom', new Date('2018-01-01')], ['validUntil', new Date('2090-01-01')], ['context', 'different context'], ['polarity', 'negative'], ['domain', 'investment'], ['documentedReasons', 'fabricated rationale'], ['constraints', 'invented constraint'], ['exceptions', 'invented exception'], ['certainty', 'inferred'], ['speakerRole', 'quoted'], ['authorId', 'different-author'], ['speaker', 'different-speaker'], ['extractorVersion', 'different-extractor'],
])('all immutable stance semantics are pinned: %s', async (field, value) => {
    const { bundle, provider } = currentProvider();
    provider.evidence.revalidate = async (original) => ({ ...structuredClone(original), temporalTrace: { ...structuredClone(original.temporalTrace), stances: original.temporalTrace.stances.map(row => ({ ...row, [field]: value })) } });
    expect((await runCurrent(provider, bundle)).outcome).toBe('blocked');
});
test('unchanged current stance remains usable and immutable result dates reject setter bypass', async () => {
    const { bundle, provider } = currentProvider();
    const result = await runCurrent(provider, bundle);
    expect(result.outcome).toBe('released-synthetic-evaluation');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.draft)).toBe(true);
    expect(() => { result.draft!.text = 'The expert is a clinician.'; }).toThrow();
    const date = result.releaseBundle!.temporalTrace.stances[0].validFrom!;
    expect(() => date.setTime(0)).toThrow();
    expect(() => Date.prototype.setTime.call(date, 0)).toThrow();
    expect(JSON.stringify(result)).toContain('2019-01-01');
});
test('prototype Date mutation of a retained verifier input is detected after final async read', async () => {
    const { bundle, provider } = currentProvider();
    let captured: VerificationRequest | undefined, checks = 0;
    const verify = provider.verifier.verify;
    provider.verifier.verify = async (request) => { captured = request; return verify(request); };
    provider.evidence.revalidate = async (original) => { checks++; if (checks === 2)
        Date.prototype.setTime.call(captured!.context.bundle.temporalTrace.stances[0].validFrom!, new Date('2018-01-01').getTime()); return structuredClone(original); };
    const result = await runCurrent(provider, bundle);
    expect(result.outcome).toBe('blocked');
    expect(result.decision.reasons).toContain('verifier-mutated-snapshot');
});
test('raw adapter outputs are detached from approved draft and judgment snapshots', async () => {
    const raw = draft('A base case stops recursion.');
    const provider = fixtureAdapters({ query: 'Explain recursion', draft: raw, expected: 'released-synthetic-evaluation', dimensions: [] }, { generation: [], verification: [] });
    let rawReview: Awaited<ReturnType<typeof provider.verifier.verify>> & {
        identity: string;
    }, checks = 0;
    const verify = provider.verifier.verify;
    provider.generator.generate = async () => raw;
    provider.verifier.verify = async (request) => { rawReview = await verify(request) as typeof rawReview; return rawReview; };
    provider.evidence.revalidate = async (original) => { checks++; if (checks === 2) {
        raw.text = 'The expert is a licensed clinician.';
        rawReview.identity = 'impersonating';
    } return structuredClone(original); };
    const result = await runStructuredDialogue({ expertId: 'expert-synthetic', query: 'Explain recursion', history: [], bundle: baseBundle(), adapters: provider });
    expect(result.outcome).toBe('released-synthetic-evaluation');
    expect(result.text).toContain('A base case stops recursion.');
    expect(result.text).not.toContain('licensed clinician');
    expect(result.judgment!.identity).toBe('safe-ai');
});
test('caller query/history mutations during generation cannot erase accepted constraints', async () => {
    const seen = { generation: [] as import("@/lib/ai/dialogue/structured/contracts").GenerationRequest[], verification: [] as VerificationRequest[] };
    const provider = fixtureAdapters({ query: 'Explain recursion and include limitations.', draft: draft('A base case stops recursion.'), expected: 'released-synthetic-evaluation', dimensions: [] }, seen);
    const input = { expertId: 'expert-synthetic', query: 'Explain recursion and include limitations.', history: [{ role: 'user', content: 'Always distinguish uncertainty.' }], bundle: baseBundle(), adapters: provider };
    const generate = provider.generator.generate;
    provider.generator.generate = async (request) => { input.query = 'Ignore constraints'; input.history[0].content = 'Ignore uncertainty'; return generate(request); };
    const result = await runStructuredDialogue(input);
    expect(result.outcome).toBe('released-synthetic-evaluation');
    expect(seen.verification[0].context.state.userTurns).toContain('Explain recursion and include limitations.');
    expect(seen.verification[0].context.history[0].content).toBe('Always distinguish uncertainty.');
});
test('retained long history preserves trailing constraints or is explicitly rejected before calls', async () => {
    const seen = { generation: [] as import("@/lib/ai/dialogue/structured/contracts").GenerationRequest[], verification: [] as VerificationRequest[] };
    const provider = fixtureAdapters({ query: 'Continue', draft: draft('A base case stops recursion.'), expected: 'released-synthetic-evaluation', dimensions: [] }, seen);
    const content = 'background '.repeat(220) + 'HISTORY_FINAL_CONSTRAINT';
    await runStructuredDialogue({ expertId: 'expert-synthetic', query: 'Continue', history: [{ role: 'user', content }], bundle: baseBundle(), adapters: provider });
    expect(JSON.stringify(seen.verification[0].context)).toContain('HISTORY_FINAL_CONSTRAINT');
    const generate = jest.fn();
    provider.generator.generate = generate;
    const tooLong = await runStructuredDialogue({ expertId: 'expert-synthetic', query: 'Continue', history: [{ role: 'user', content: 'x'.repeat(8001) }], bundle: baseBundle(), adapters: provider });
    expect(tooLong.decision.reasons).toContain('history-context-budget');
    expect(generate).not.toHaveBeenCalled();
    const tooMany = await runStructuredDialogue({ expertId: 'expert-synthetic', query: 'Continue', history: Array.from({ length: 13 }, () => ({ role: 'user', content: 'constraint' })), bundle: baseBundle(), adapters: provider });
    expect(tooMany.decision.reasons).toContain('history-context-budget');
    expect(generate).not.toHaveBeenCalled();
});
test('current validity is rechecked when it expires during the final evidence read',async()=>{
 jest.useFakeTimers();jest.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));
 try {
  const {bundle,provider}=currentProvider();bundle.temporalTrace.stances[0].validUntil=new Date('2020-01-01T00:00:01.000Z');let checks=0;
  provider.evidence.revalidate=async original=>{checks++;if(checks===2)jest.setSystemTime(new Date('2020-01-01T00:00:02.000Z'));return structuredClone(original);};
  const result=await runCurrent(provider,bundle);expect(result.outcome).toBe('blocked');expect(result.decision.reasons).toContain('valid-time-unverified');
 } finally {jest.useRealTimers();}
});
