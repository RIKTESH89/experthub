import prisma from "../mocks/prisma";
const retrieve=jest.fn(), scope=jest.fn(), pins=jest.fn();
jest.mock("@/lib/prisma",()=>({__esModule:true,default:prisma}));
jest.mock("@/lib/retrieval/retrieve",()=>({retrieveIntentEvidence:retrieve}));
jest.mock("@/lib/knowledge/access",()=>({resolveRetrievalScope:scope}));
jest.mock("@/lib/persona/store",()=>({currentSourcePins:pins}));
jest.mock("@/lib/ai/memory-manager",()=>({getMemories:jest.fn(async()=>[])}));
import { runChatEngine } from "@/lib/ai/chat-engine";
import { manifestHash } from "@/lib/persona/manifest";
import { EXTRACTOR_VERSION } from "@/lib/graph/evidence-extractor";
import { ACTIVE_TEMPORAL_READ_VERSION } from "@/lib/graph/temporal/read-policy";
const pin={itemId:"item",sourceVersion:1,revisionId:"r",contentHash:"h",snapshotHash:"s",extractorVersion:EXTRACTOR_VERSION,vectorIds:["approved"]};
const manifest={format:"persona-release-v1",expertProfileId:"expert",config:{ragEnabled:true},sources:[pin],identity:{displayName:"Approved identity"},renderedPersona:{visitor:"APPROVED_VISITOR",owner:"APPROVED_OWNER"},algorithms:{evidence:EXTRACTOR_VERSION,temporal:ACTIVE_TEMPORAL_READ_VERSION}};
beforeEach(()=>{
 delete process.env.EXP15_EXP17_LOCAL_EVALUATION;
 prisma.expertProfile.findUnique.mockResolvedValue({id:"expert",userId:"owner",displayName:"DRAFT_IDENTITY",vectorNamespace:"ns",ragEnabled:true,twinPersonality:"DRAFT_PERSONALITY"});
 prisma.$queryRaw.mockResolvedValue([{id:"head",expertProfileId:"expert",manifest,manifestHash:manifestHash(manifest)}]);
 scope.mockResolvedValue({expertProfileId:"expert",namespace:"ns",isOwner:false,allowedVectorIds:["approved","draft"]});
 pins.mockResolvedValue([pin]);retrieve.mockResolvedValue({sources:[],evidenceTrace:[],temporalTrace:{stances:[],supersededStances:[],relations:[]},prompt:"bounded",gaps:[]});
 global.fetch=jest.fn().mockResolvedValue({ok:true,body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));c.close();}})});
});
afterEach(()=>{delete process.env.EXP15_EXP17_LOCAL_EVALUATION;});
test.each([false,true])("real chat routing adopts active release, experimental=%s",async experimental=>{
 if(experimental)process.env.EXP15_EXP17_LOCAL_EVALUATION="1";
 await runChatEngine({expertId:"owner",query:"question",chatHistory:[]});
 expect(retrieve).toHaveBeenCalledWith(expect.objectContaining({allowedVectorIds:["approved"],temporalReadVersion:ACTIVE_TEMPORAL_READ_VERSION}),"question",undefined);
 const prompt=JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).messages[0].content;
 expect(prompt).toContain("APPROVED_VISITOR");expect(prompt).not.toContain("DRAFT_");expect(prompt).not.toContain("APPROVED_OWNER");
});
test("active head changes before provider handoff cancel frozen response",async()=>{
 prisma.$queryRaw.mockResolvedValueOnce([{id:"head",expertProfileId:"expert",manifest,manifestHash:manifestHash(manifest)}]).mockResolvedValue([{id:"new-head",expertProfileId:"expert",manifest,manifestHash:manifestHash(manifest)}]);
 await expect(runChatEngine({expertId:"owner",query:"question",chatHistory:[]})).rejects.toThrow("Persona release or access changed");
});

// Independent review regression: first publication while provider response is pending.
test.each([false,true])("first head activated before handoff must cancel draft response, experimental=%s",async experimental=>{
 if(experimental)process.env.EXP15_EXP17_LOCAL_EVALUATION="1";
 prisma.$queryRaw.mockResolvedValue([]);
 const originalFetch=global.fetch;
 global.fetch=jest.fn(async(...args)=>{
   const response=await (originalFetch as jest.Mock)(...args);
   // Publication completes after initial no-head lookup and before provider headers return.
   prisma.$queryRaw.mockResolvedValue([{id:"first-head",expertProfileId:"expert",manifest,manifestHash:manifestHash(manifest)}]);
   return response;
 });
 const result=runChatEngine({expertId:"owner",query:"question",chatHistory:[]});
 if(experimental) expect((await result).verification?.status).toBe("abstained");
 else {
   const outcome=await result.then(value=>({value,error:null}),error=>({value:null,error}));
   const draftPrompt=JSON.parse((originalFetch as jest.Mock).mock.calls[0][1].body).messages[0].content;
   expect(draftPrompt).toContain("DRAFT_IDENTITY");
   expect(outcome.error).toBeInstanceOf(Error);
 }
});

test.each(['source','rag','audience','abort','permission-error'])('baseline cancels provider body on handoff %s',async mode=>{
 const cancel=jest.fn(), abort=new AbortController();
 const body=new ReadableStream({pull(){},cancel});
 global.fetch=jest.fn(async()=>{
  if(mode==='source')pins.mockResolvedValue([]);
  if(mode==='rag')prisma.expertProfile.findUnique.mockResolvedValue({id:'expert',userId:'owner',vectorNamespace:'ns',ragEnabled:false});
  if(mode==='audience')scope.mockResolvedValue({expertProfileId:'expert',namespace:'ns',isOwner:true,allowedVectorIds:['approved']});
  if(mode==='abort')abort.abort();
  if(mode==='permission-error')scope.mockRejectedValue(new Error('permission unavailable'));
  return new Response(body);
 });
 await expect(runChatEngine({expertId:'owner',query:'question',chatHistory:[],signal:abort.signal})).rejects.toThrow();
 expect(cancel).toHaveBeenCalledTimes(1);
});
test('unchanged null head preserves baseline compatibility but still rechecks access',async()=>{
 prisma.$queryRaw.mockResolvedValue([]);
 await runChatEngine({expertId:'owner',query:'question',chatHistory:[]});
 expect(scope).toHaveBeenCalledTimes(2);
 expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
});

test.each(['source','rag','audience','head','first-head','permission-error'])('baseline refuses mid-stream %s change before next chunk',async mode=>{
 if(mode==='first-head')prisma.$queryRaw.mockResolvedValue([]);
 const cancel=jest.fn();let count=0;
 global.fetch=jest.fn(async()=>new Response(new ReadableStream({pull(c){c.enqueue(new TextEncoder().encode(`chunk-${count++}`));},cancel},{highWaterMark:0})));
 const result=await runChatEngine({expertId:'owner',query:'question',chatHistory:[]});const reader=result.stream.getReader();
 expect(new TextDecoder().decode((await reader.read()).value)).toBe('chunk-0');
 if(mode==='source')pins.mockResolvedValue([]);
 if(mode==='rag')prisma.expertProfile.findUnique.mockResolvedValue({id:'expert',userId:'owner',vectorNamespace:'ns',ragEnabled:false});
 if(mode==='audience')scope.mockResolvedValue({expertProfileId:'expert',namespace:'ns',isOwner:true,allowedVectorIds:['approved']});
 if(mode==='head'||mode==='first-head')prisma.$queryRaw.mockResolvedValue([{id:'new-head',expertProfileId:'expert',manifest,manifestHash:manifestHash(manifest)}]);
 if(mode==='permission-error')scope.mockRejectedValue(new Error('permission unavailable'));
 await expect(reader.read()).rejects.toThrow();expect(cancel).toHaveBeenCalledTimes(1);
});
test('active v2 model remains captured across process setting changes',async()=>{
 const {currentRuntimePolicy}=await import('@/lib/persona/runtime');const original=process.env.OPENAI_MODEL;
 try{
  process.env.OPENAI_MODEL='synthetic-A';const v2={...manifest,format:'persona-release-v2',runtime:currentRuntimePolicy(),greetings:{chat:'Approved',widget:null}};process.env.OPENAI_MODEL='synthetic-B';
  prisma.$queryRaw.mockResolvedValue([{id:'head',expertProfileId:'expert',manifest:v2,manifestHash:manifestHash(v2)}]);
  const result=await runChatEngine({expertId:'owner',query:'question',chatHistory:[]});
  expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({model:'synthetic-A',temperature:0.5,max_tokens:2048});await result.stream.cancel();
 }finally{if(original===undefined)delete process.env.OPENAI_MODEL;else process.env.OPENAI_MODEL=original;}
});
