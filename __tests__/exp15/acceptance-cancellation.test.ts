import { runStructuredDialogue } from '@/lib/ai/dialogue/structured/pipeline';
import { baseBundle, draft } from '../../scripts/exp15-exp17/fixtures';
import type {GenerationRequest,VerificationRequest} from '@/lib/ai/dialogue/structured/contracts';
import { fixtureAdapters } from '../../scripts/exp15-exp17/runner';
const saved = process.env;
beforeEach(() => {process.env={...saved,NODE_ENV:'test',EXP15_EXP17_LOCAL_EVALUATION:'1'};delete process.env.VERCEL;delete process.env.VERCEL_ENV;delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED;});
afterEach(() => {process.env=saved;});
const provider = () => fixtureAdapters({query:'Explain recursion',draft:draft('A base case stops recursion.'),expected:'released-synthetic-evaluation',dimensions:[]},{generation:[],verification:[]});
const run = (adapters: ReturnType<typeof provider>, signal?: AbortSignal) => runStructuredDialogue({expertId:'expert-synthetic',query:'Explain recursion',history:[],bundle:baseBundle(),adapters,signal});
test('a pre-cancelled turn invokes no generation, verification or live evidence adapters',async () => {
  const p = provider(), c = new AbortController(); c.abort();
  p.generator.generate=jest.fn();p.verifier.verify=jest.fn();p.evidence.revalidate=jest.fn();
  const result = await run(p,c.signal);
  expect(result.decision.reasons).toEqual(['evaluation-cancelled']);expect(result.providerCalls).toBe(0);
  expect(p.generator.generate).not.toHaveBeenCalled();expect(p.verifier.verify).not.toHaveBeenCalled();expect(p.evidence.revalidate).not.toHaveBeenCalled();
});
test.each(['generation','verification','final-evidence'] as const)('interrupt during %s aborts the adapter, blocks bytes and lets a fresh retry succeed',async stage => {
  const p=provider(), c=new AbortController();let observed: AbortSignal | undefined;
  const hang = async (signal:AbortSignal) => {observed=signal;c.abort();return new Promise<never>(() => {});};
  if(stage==='generation') p.generator.generate = request => hang(request.signal);
  if(stage==='verification') p.verifier.verify = request => hang(request.signal);
  if(stage==='final-evidence') {let checks=0;p.evidence.revalidate=async(original,signal)=>++checks===2?hang(signal):structuredClone(original);}
  const result = await run(p,c.signal);
  expect(observed?.aborted).toBe(true);expect(result.outcome).toBe('blocked');expect(result.decision.reasons).toEqual(['evaluation-cancelled']);
  expect(result.text).not.toContain('base case');expect(result.decision.acceptedSpanIds).toEqual([]);expect(result.attempts).toBe(1);
  expect((await run(provider())).outcome).toBe('released-synthetic-evaluation');
});
test('cancellation subscription is removed after successful completion',async () => {
  const c=new AbortController(), add=jest.spyOn(c.signal,'addEventListener'), remove=jest.spyOn(c.signal,'removeEventListener');
  expect((await run(provider(),c.signal)).outcome).toBe('released-synthetic-evaluation');
  expect(add.mock.calls.filter(c => c[0]==='abort')).toHaveLength(4);
  expect(remove.mock.calls.filter(c => c[0]==='abort')).toHaveLength(4);
});
test('independent new goal gives both adapters explicit prior-task scope despite retained raw candidates',async()=>{
 const seen={generation:[] as GenerationRequest[],verification:[] as VerificationRequest[]};
 const p=fixtureAdapters({query:'Explain recursion',draft:draft('A base case stops recursion.'),expected:'released-synthetic-evaluation',dimensions:[]},seen);
 const history=[{role:'user',content:'I need a medical study summary under 500 words, only clinical evidence.'},{role:'assistant',content:'I will review the studies.'}];
 const result=await runStructuredDialogue({expertId:'expert-synthetic',query:'Explain recursion',history,bundle:baseBundle(),adapters:p});
 expect(result.outcome).toBe('released-synthetic-evaluation');
 for(const request of [seen.generation[0],seen.verification[0]]){
  expect(request.context.state.risk).toBe('ordinary');expect(request.context.state.continuity.currentGoal).toBe('Explain recursion');
  expect(request.context.state.continuity.constraints[0].text).toBe(history[0].content);
  expect(request.instructions).toContain('An independent new goal makes prior task constraints, questions and commitments historical');
  expect(request.instructions).toContain('including explicitly persistent global preferences');
 }
});
