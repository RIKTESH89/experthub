import { quotationsSupported } from '../../src/lib/ai/dialogue/structured/literal-support';
test('curly possessive inside quotation cannot hide invented suffix',()=>{
 expect(quotationsSupported('The source says ‘trials’ outcomes are invented’.',[{text:'trials’ outcomes are calibrated'}])).toBe(false);
});
import { acceptanceCases } from '../../scripts/exp17/cases';
import { evaluateCase } from '../../scripts/exp17/evaluate';
test('plural possessive ambiguity cannot release invented quote through source-explanation',()=>{
 const c=acceptanceCases().find(c=>c.id==='ordinary-exact-quotation')!;
 c.bundle.evidenceTrace[0].text='trials’ outcomes are calibrated';
 c.response.text='The source says ‘trials’ outcomes are invented’.';
 const claim=c.response.claims[0];claim.category='source-explanation';delete claim.personId;claim.end=c.response.text.length;
 expect(evaluateCase(c).decision.allowed).toBe(false);
});
