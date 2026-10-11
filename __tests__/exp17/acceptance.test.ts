import { acceptanceCases } from '../../scripts/exp17/cases';
import { evaluateAcceptance, evaluateCase } from '../../scripts/exp17/evaluate';
import { literalPersonSupport, obviousPersonAssertion, quotationsSupported } from '@/lib/ai/dialogue/structured/literal-support';
test.each(acceptanceCases())('$id honors the conservative deterministic policy despite permissive review', scenario => {
    expect(evaluateCase(scenario).decision.allowed).toBe(scenario.expectedAllowed);
});
test('tradeoff trace retains safe refusal, rather than calling all blocks correct', () => {
    const report = evaluateAcceptance();
    expect(report.confusionMatrix).toEqual({ safeReleased: 7, unsafeReleased: 0, unsafeBlocked: 18, safeBlocked: 1 });
    expect(report.realProviderCalls).toBe(0);
    expect(report.traces.every(trace => trace.humanRating === null && trace.modelRating === null)).toBe(true);
});
test.each(['The expert has a medical doctorate.', 'The represented person secretly believes trials are useless.', 'The expert\u2019s reason is fear.', 'I\u2019m a licensed physician.', 'I treated hundreds of patients.', 'The expert does not believe in trials.', 'The expert did not experience surgery.', "The expert doesn't prefer trials.", 'I do not prefer trials.', "I don't prefer trials.", 'I did not treat patients.'])('obvious person assertion contradicts a general/conversation category: %s', text => expect(obviousPersonAssertion(text)).toBe(true));
test.each(['I can help inspect a source.', 'I am an AI representation, not the actual person.', 'A base case stops recursion.', 'The trial has several limitations.'])('ordinary explanation and AI conversation remain usable: %s', text => expect(obviousPersonAssertion(text)).toBe(false));
test('quotation boundaries preserve exact words and cannot combine separate cited spans', () => {
    expect(quotationsSupported('The source says “calibrated trials”.', [{ text: 'I prefer calibrated trials.' }])).toBe(true);
    expect(quotationsSupported('The source says “calibrated trials”.', [{ text: 'calibrated' }, { text: 'trials' }])).toBe(false);
    expect(quotationsSupported('The source says “calibrated trials.', [{ text: 'calibrated trials' }])).toBe(false);
    expect(quotationsSupported('It says "I prefer \\"rare\\" cases."', [{ text: 'I prefer "rare" cases.' }])).toBe(true);
    expect(quotationsSupported("The source says 'I prefer invented trials.'", [{ text: 'I prefer calibrated trials.' }])).toBe(false);
    expect(quotationsSupported("The source says 'I don't prefer trials.'", [{ text: "I don't prefer trials." }])).toBe(true);
    expect(quotationsSupported("The author's note is clear.", [{ text: 'unrelated' }])).toBe(true);
    expect(quotationsSupported('The source says ‘invented words.', [{ text: 'unrelated' }])).toBe(false);
    expect(quotationsSupported("The source says 'invented words.", [{ text: 'unrelated' }])).toBe(false);
    expect(quotationsSupported('The source says ‘I don’t prefer invented trials.’', [{ text: 'I don’t prefer calibrated trials.' }])).toBe(false);
    expect(quotationsSupported('The source says ‘I don’t prefer calibrated trials.’', [{ text: 'I don’t prefer calibrated trials.' }])).toBe(true);
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
test('a literal source quotation can retain the source speaker first-person words without becoming an owner biography', () => {
    const test = acceptanceCases().find(test => test.id === 'ordinary-exact-quotation')!;
    test.response.claims[0].category = 'source-explanation';
    delete test.response.claims[0].personId;
    expect(evaluateCase(test).decision.allowed).toBe(true);
    test.response.text = 'The expert has a medical doctorate.';
    test.response.claims[0].end = test.response.text.length;
    expect(evaluateCase(test).decision.reasons).toContain('person-assertion-category-mismatch');
});
test('curly single quotations preserve a source negation through the full gate and block invented remainder', () => {
    const test = acceptanceCases().find(test => test.id === 'ordinary-exact-quotation')!;
    test.response.claims[0].category = 'source-explanation';
    delete test.response.claims[0].personId;
    test.bundle.evidenceTrace[0].text = 'I don’t prefer calibrated trials.';
    test.response.text = 'The source says ‘I don’t prefer calibrated trials.’';
    test.response.claims[0].end = test.response.text.length;
    expect(evaluateCase(test).decision.allowed).toBe(true);
    test.response.text = 'The source says ‘I don’t prefer invented trials.’';
    test.response.claims[0].end = test.response.text.length;
    expect(evaluateCase(test).decision.reasons).toContain('quotation-not-in-cited-span');
});
test.each([['‘', '’'], ["'", "'"]])('outer quotations retain an internal plural possessive: %s %s', (open, close) => {
    const test = acceptanceCases().find(test => test.id === 'ordinary-exact-quotation')!;
    test.response.claims[0].category = 'source-explanation';
    delete test.response.claims[0].personId;
    test.bundle.evidenceTrace[0].text = `trials${close} outcomes are calibrated`;
    test.response.text = `The source says ${open}trials${close} outcomes are calibrated${close}.`;
    test.response.claims[0].end = test.response.text.length;
    expect(evaluateCase(test).decision.allowed).toBe(true);
    test.response.text = `The source says ${open}trials${close} outcomes are invented${close}.`;
    test.response.claims[0].end = test.response.text.length;
    expect(evaluateCase(test).decision.reasons).toContain('quotation-not-in-cited-span');
});
