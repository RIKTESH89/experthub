import {runStructuredDialogue} from '@/lib/ai/dialogue/structured/pipeline';
import {type VerificationRequest} from '@/lib/ai/dialogue/structured/contracts';
import {baseBundle,draft,reference} from '../../../scripts/exp15-exp17/fixtures';
import {fixtureAdapters} from '../../../scripts/exp15-exp17/runner';
const saved=process.env;
beforeEach(()=>{process.env={...saved,NODE_ENV:'test',EXP15_EXP17_LOCAL_EVALUATION:'1'};delete process.env.VERCEL;delete process.env.VERCEL_ENV;delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED;});
afterEach(()=>{process.env=saved;});
test('a draft cannot change after approving verification while final source reads are pending',async()=>{
 const provider=fixtureAdapters({query:'Explain recursion',draft:draft('A base case stops recursion.'),expected:'released-synthetic-evaluation',dimensions:[]},{generation:[],verification:[]});
 let captured:VerificationRequest|undefined,checks=0;const verify=provider.verifier.verify;
 provider.verifier.verify=async request=>{captured=request;return verify(request);};
 provider.evidence.revalidate=async original=>{checks++;if(checks===2)captured!.draft.text='The expert is a licensed clinician.';return structuredClone(original);};
 const result=await runStructuredDialogue({expertId:'expert-synthetic',query:'Explain recursion',history:[],bundle:baseBundle(),adapters:provider});
 expect(result.outcome).toBe('blocked');expect(result.text).not.toContain('licensed clinician');
});
test('live pins cannot invent a validity start absent from the immutable original stance',async()=>{
 const bundle=baseBundle();const row=bundle.evidenceTrace[0];
 bundle.temporalTrace.stances=[{...row,id:'stance-a',speaker:'expert-synthetic',origin:'author',domain:'research',context:null,category:'preference',polarity:'positive',action:'preregistered protocols',validFrom:null,validUntil:null,recordedAt:new Date('2020-01-01'),supersedes:null,certainty:'explicit',situation:null,constraints:null,chosenAction:null,documentedReasons:null,alternatives:null,tradeoffs:null,exceptions:null,decisionType:null}] as unknown as typeof bundle.temporalTrace.stances;
 const answer=draft('The expert currently prefers preregistered protocols.','person-belief',{personId:'expert-synthetic',evidence:[reference],frame:{mode:'current'}});
 const provider=fixtureAdapters({query:'What is their current preference?',draft:answer,expected:'blocked',dimensions:[]},{generation:[],verification:[]});
 provider.evidence.revalidate=async original=>({...structuredClone(original),temporalTrace:{...structuredClone(original.temporalTrace),stances:original.temporalTrace.stances.map(s=>({...s,validFrom:new Date('2019-01-01')}))}});
 const result=await runStructuredDialogue({expertId:'expert-synthetic',query:'What is their current preference?',history:[],bundle,adapters:provider});
 expect(result.outcome).toBe('blocked');
});
test('all accepted current-user constraints reach both generation and independent verification',async()=>{
 const query='Explain recursion. '+'background '.repeat(220)+' CRITICAL_FINAL_CONSTRAINT: include limitations and no investment advice.';
 const seen:Parameters<typeof fixtureAdapters>[1]={generation:[],verification:[]};
 const provider=fixtureAdapters({query,draft:draft('A base case stops recursion.'),expected:'released-synthetic-evaluation',dimensions:[]},seen);
 await runStructuredDialogue({expertId:'expert-synthetic',query,history:[],bundle:baseBundle(query),adapters:provider});
 expect(JSON.stringify(seen.generation[0].context)).toContain('CRITICAL_FINAL_CONSTRAINT');
 expect(JSON.stringify(seen.verification[0].context)).toContain('CRITICAL_FINAL_CONSTRAINT');
});
