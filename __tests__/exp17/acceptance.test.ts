import { acceptanceCases } from '../../scripts/exp17/cases';
import { evaluateAcceptance, evaluateCase } from '../../scripts/exp17/evaluate';
import { literalPersonSupport, quotationsSupported } from '@/lib/ai/dialogue/structured/literal-support';
test.each(acceptanceCases())('$id honors the conservative deterministic policy despite permissive review', scenario => {
    expect(evaluateCase(scenario).decision.allowed).toBe(scenario.expectedAllowed);
});
test('tradeoff trace retains the known permissive category failure and safe refusal, rather than calling all blocks correct', () => {
    const report = evaluateAcceptance();
    expect(report.confusionMatrix).toEqual({ safeReleased: 6, unsafeReleased: 1, unsafeBlocked: 15, safeBlocked: 1 });
    expect(report.realProviderCalls).toBe(0);
    expect(report.traces.every(trace => trace.humanRating === null && trace.modelRating === null)).toBe(true);
});
test('quotation boundaries preserve exact words and cannot combine separate cited spans', () => {
    expect(quotationsSupported('The source says “calibrated trials”.', [{ text: 'I prefer calibrated trials.' }])).toBe(true);
    expect(quotationsSupported('The source says “calibrated trials”.', [{ text: 'calibrated' }, { text: 'trials' }])).toBe(false);
    expect(quotationsSupported('The source says “calibrated trials.', [{ text: 'calibrated trials' }])).toBe(false);
    expect(quotationsSupported('It says "I prefer \\"rare\\" cases."', [{ text: 'I prefer "rare" cases.' }])).toBe(true);
    expect(quotationsSupported("The source says 'I prefer invented trials.'", [{ text: 'I prefer calibrated trials.' }])).toBe(false);
    expect(quotationsSupported("The source says 'I don't prefer trials.'", [{ text: "I don't prefer trials." }])).toBe(true);
    expect(quotationsSupported("The author's note is clear.", [{ text: 'unrelated' }])).toBe(true);
});
test('a forged predicate/object extraction cannot convert a source negation into positive support', () => {
    expect(literalPersonSupport('The expert prefers trials.', [{ text: 'I do not prefer trials.', predicate: 'prefer', object: 'trials' }])).toBe(false);
    expect(literalPersonSupport('The expert prefers trials.', [{ text: 'I prefer trials only when calibrated.', predicate: 'prefer', object: 'trials' }])).toBe(false);
});
test('H03-style supported verdict without citations is not evidence-backed general information', () => {
    const test = acceptanceCases().find(test => test.id === 'ordinary-general-explanation')!;
    test.verdict = 'supported';
    expect(evaluateCase(test).decision.reasons).toContain('supported-verdict-without-evidence');
    test.verdict = 'general-information';
    expect(evaluateCase(test).decision.allowed).toBe(true);
});
