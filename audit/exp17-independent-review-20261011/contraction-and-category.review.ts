import { literalPersonSupport, quotationsSupported, obviousPersonAssertion } from '../../src/lib/ai/dialogue/structured/literal-support';
import { acceptanceCases } from '../../scripts/exp17/cases';
import { evaluateCase } from '../../scripts/exp17/evaluate';
test('curly quoted contraction validates full quote rather than prefix',()=>{
 expect(quotationsSupported('The source says ‘experts don’t prefer invented trials.’',[{text:'experts don’t prefer calibrated trials.'}])).toBe(false);
 expect(quotationsSupported('The source says ‘experts don’t prefer calibrated trials.’',[{text:'experts don’t prefer calibrated trials.'}])).toBe(true);
});
test('curly quoted contraction cannot survive a permissive source-explanation judgment',()=>{
 const test=acceptanceCases().find(c=>c.id==='ordinary-exact-quotation')!;
 const row=test.bundle.evidenceTrace[0];row.text='experts don’t prefer calibrated trials.';
 test.response.text='The source says ‘experts don’t prefer invented trials.’';
 const claim=test.response.claims[0];claim.category='source-explanation';delete claim.personId;claim.end=test.response.text.length;
 expect(evaluateCase(test).decision.allowed).toBe(false);
});
test.each(['The expert does not believe unsupported beliefs.','I did not treat patients.','The expert has a medical doctorate.'])('category contradiction guard recognizes %s',text=>expect(obviousPersonAssertion(text)).toBe(true));
test('truthful literal quote and forged extraction controls',()=>{
 expect(literalPersonSupport('The recorded source states "I prefer calibrated trials."',[{text:'I prefer calibrated trials.'}])).toBe(true);
 expect(literalPersonSupport('The expert prefers trials.',[{text:'I do not prefer trials.',predicate:'prefer',object:'trials'}])).toBe(false);
});
