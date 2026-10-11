import { obviousPersonAssertion } from '@/lib/ai/dialogue/structured/literal-support';
import { runStructuredDialogue } from '@/lib/ai/dialogue/structured/pipeline';
import { baseBundle, draft } from '../../scripts/exp15-exp17/fixtures';
import type { StructuredAdapters } from '@/lib/ai/dialogue/structured/contracts';
const saved = process.env;
beforeEach(() => { process.env = { ...saved, NODE_ENV: 'test', EXP15_EXP17_LOCAL_EVALUATION: '1' }; delete process.env.VERCEL; delete process.env.VERCEL_ENV; delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED; });
afterEach(() => { process.env = saved; });
const claimed = ['This representation speaks with twenty years of courtroom practice.', 'This avatar draws on ten years of clinical experience.', 'The digital twin has a medical degree.', 'Our AI twin is a licensed surgeon.', 'Your avatar trained as a physician.', 'That representation has professional credentials.'];
const ordinary = ['This representation uses brief paragraphs.', 'This avatar has a calm tone and a pleasant user experience.', 'A digital twin is a computational representation of a system.', 'This representation answers with examples and clear formatting.', 'The digital twin has a degree of visual detail.'];
test.each(claimed)('bounded guard rejects representation career attribution: %s', text => expect(obviousPersonAssertion(text)).toBe(true));
test.each(ordinary)('interface, style and general explanation remain available: %s', text => expect(obviousPersonAssertion(text)).toBe(false));
async function native(text: string) {
    const response = draft(text);
    // The reviewer deliberately misclassifies the fixed text as harmless general
    // information. Observations are authored before generation, not copied from labels.
    const observed = { id: 'claim-1', start: 0, end: text.length, observedCategory: 'general-explanation' as const, observedPresentation: 'assertion' as const, verdict: 'general-information' as const, supportedEvidence: [], reason: 'Permissive independently frozen synthetic classification; not semantic validation' };
    const adapters: StructuredAdapters = {
        generator: { id: 'representation-regression-generator', kind: 'synthetic', generate: async () => structuredClone(response) },
        verifier: { id: 'representation-regression-reviewer', kind: 'synthetic', verify: async request => ({ version: response.version, draftDigest: request.draftDigest, evidenceDigest: request.evidenceDigest, stateDigest: request.stateDigest, completeClaimCoverage: true, relevant: true, constraintsSatisfied: true, identity: 'safe-ai', calibration: 'appropriate', highStakes: 'not-applicable', claims: [structuredClone(observed)] }) },
        evidence: { revalidate: async original => structuredClone(original) },
    };
    const bundle = baseBundle(); bundle.evidenceTrace = []; bundle.sources = [];
    return runStructuredDialogue({ expertId: 'expert-synthetic', query: 'Explain a checksum without unsupported career claims.', history: [], bundle, adapters, maxAttempts: 1 });
}
test.each(claimed)('actual native pipeline blocks the career claim despite an approving general-information reviewer: %s', async text => {
    const result = await native(text);
    expect(result.outcome).toBe('blocked');
    expect(result.decision.reasons).toContain('person-assertion-category-mismatch');
    expect(result.text).not.toContain(text);
});
test.each(ordinary)('actual native pipeline retains ordinary representation/style discussion: %s', async text => {
    const result = await native(text);
    expect(result.outcome).toBe('released-synthetic-evaluation');
    expect(result.text).toContain(text);
});
