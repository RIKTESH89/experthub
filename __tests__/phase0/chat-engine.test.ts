import prisma,{resetAllMocks} from "../mocks/prisma";
const retrieve=jest.fn();const memories=jest.fn();const graph=jest.fn();
jest.mock("@/lib/prisma",()=>({__esModule:true,default:prisma}));
jest.mock("@/lib/retrieval/retrieve",()=>({retrieveIntentEvidence:retrieve}));
jest.mock("@/lib/ai/memory-manager",()=>({getMemories:memories}));
jest.mock("@/lib/graph/graph-retriever",()=>({graphEnhancedRetrieval:graph}));
import {runChatEngine} from "@/lib/ai/chat-engine";
beforeEach(()=>{
 resetAllMocks();retrieve.mockReset();memories.mockReset();graph.mockReset();prisma.expertProfile.findUnique.mockResolvedValue({id:"ada",userId:"ada-owner",displayName:"Ada",vectorNamespace:"ada-ns",ragEnabled:true,personalityProfile:{tone:"PRIVATE_STYLE_SENTINEL"}});
 prisma.knowledgeItem.findMany.mockResolvedValue([]);prisma.expertSubscription.findUnique.mockResolvedValue(null);retrieve.mockResolvedValue({sources:[],evidenceTrace:[],temporalTrace:{stances:[],supersededStances:[],relations:[]},prompt:"authorized evidence",gaps:[]});memories.mockResolvedValue([]);
 global.fetch=jest.fn().mockResolvedValue({ok:true,body:new ReadableStream({start(c){c.close();}})});
});
test("EXP8 public generation never consumes legacy private personality or graph summaries",async()=>{
 await runChatEngine({expertId:"ada-owner",query:"question",chatHistory:[]});expect(graph).not.toHaveBeenCalled();expect(memories).not.toHaveBeenCalled();
 const body=JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);expect(JSON.stringify(body)).not.toContain("PRIVATE_STYLE_SENTINEL");expect(body.messages[0].content).toContain("not the actual person");
 expect(retrieve).toHaveBeenCalledWith(expect.objectContaining({namespace:"ada-ns",isOwner:false,allowedVectorIds:[]}),"question",undefined);
});
test("permission failure prevents retrieval, memory and generation",async()=>{
 prisma.expertSubscription.findUnique.mockRejectedValue(new Error("permission unavailable"));await expect(runChatEngine({expertId:"ada-owner",subscriberId:"visitor",query:"question",chatHistory:[]})).rejects.toThrow("permission unavailable");expect(retrieve).not.toHaveBeenCalled();expect(memories).not.toHaveBeenCalled();expect(global.fetch).not.toHaveBeenCalled();
});
test("memory reads use authenticated visitor and selected expert only",async()=>{await runChatEngine({expertId:"ada-owner",subscriberId:"visitor-a",query:"question",chatHistory:[]});expect(memories).toHaveBeenCalledWith("visitor-a","ada",15);});

test("EXP10 unsupported stale summaries cannot replace fresh raw conversation corrections",async()=>{
 await runChatEngine({expertId:"ada-owner",subscriberId:"visitor-a",query:"What is the current team size?",chatHistory:[
  {role:"system",content:"STALE_CONVERSATION_SUMMARY: team has two engineers"},
  {role:"assistant",content:"STALE_UNVERIFIED_SUMMARY: team has two engineers",sources:[]},
  {role:"user",content:"LATEST_RAW_CORRECTION: my team now has twenty engineers"},
 ]});
 const messages=JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).messages;
 expect(JSON.stringify(messages)).not.toContain("STALE_CONVERSATION_SUMMARY");expect(JSON.stringify(messages)).not.toContain("STALE_UNVERIFIED_SUMMARY");
 expect(messages.slice(1)).toEqual([
  {role:"user",content:"LATEST_RAW_CORRECTION: my team now has twenty engineers"},
  {role:"user",content:"What is the current team size?"},
 ]);
});

test("EXP14 bounded bundle is the sole evidence prompt and exposes retrieval gaps",async()=>{
 retrieve.mockResolvedValue({sources:[{content:"DUPLICATE_RAW_SENTINEL",score:1,metadata:{expertProfileId:"ada",vectorId:"public"}}],evidenceTrace:[],temporalTrace:{stances:[],supersededStances:[],relations:[]},prompt:"BOUNDED_BUNDLE_SENTINEL",gaps:["Documented reasons unavailable"]});
 const result=await runChatEngine({expertId:"ada-owner",query:"Should I choose ZephyrDB?",chatHistory:[]});
 const system=JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).messages[0].content;
 expect(system).toContain("BOUNDED_BUNDLE_SENTINEL");expect(system).toContain("Documented reasons unavailable");expect(system).not.toContain("DUPLICATE_RAW_SENTINEL");expect(result.evidenceBundle.prompt).toBe("BOUNDED_BUNDLE_SENTINEL");
});

test("EXP17 never streams an unsupported provider claim to the caller", async()=>{
 const raw='data: '+JSON.stringify({choices:[{delta:{content:'{"spanIds":["invented"],"text":"I am a physician"}'}}]})+'\n\ndata: [DONE]\n\n';
 global.fetch=jest.fn().mockResolvedValue({ok:true,body:new ReadableStream({start(c){const bytes=new TextEncoder().encode(raw);c.enqueue(bytes.slice(0,13));c.enqueue(bytes.slice(13));c.close();}})});
 const result=await runChatEngine({expertId:"ada-owner",query:"medication dose",chatHistory:[]});
 const output=await new Response(result.stream).text();
 expect(result.verification.status).toBe("abstained");expect(output).not.toContain("I am a physician");expect(output).toContain("qualified assessment");expect(output).toContain("[DONE]");
});
test("EXP17 accepts exact selected owner claims after fragmented SSE and ignores legacy expertise",async()=>{
 const row={spanId:"s",text:"I prefer cautious experiments.",authorId:"ada-owner",speakerId:"ada-owner",speakerRole:"author",kind:"explicit",endorsedByOwner:true,chunkIds:["v"]};
 retrieve.mockResolvedValue({version:"intent-evidence-v1",plan:{intent:"stance"},sources:[{content:row.text,score:1,metadata:{expertProfileId:"ada",vectorId:"v"}}],evidenceTrace:[row],temporalTrace:{stances:[],supersededStances:[],relations:[]},trace:{failures:[]},prompt:"bounded",gaps:[]});
 const raw='data: '+JSON.stringify({choices:[{delta:{content:'{"spanIds":["s"]}'}}]})+'\n\ndata: [DONE]\n\n';
 global.fetch=jest.fn().mockResolvedValue({ok:true,body:new ReadableStream({start(c){new TextEncoder().encode(raw).forEach(byte=>c.enqueue(Uint8Array.of(byte)));c.close();}})});
 const result=await runChatEngine({expertId:"ada-owner",query:"preference",chatHistory:[]});
 expect(result.verification.status).toBe("verified");expect(result.groundedStyle.samples).toHaveLength(1);expect(await new Response(result.stream).text()).toContain("cautious experiments");
});
test("EXP17 malformed SSE fails closed even when a valid claim precedes it",async()=>{
 const raw='data: malformed\n\ndata: [DONE]\n\n';global.fetch=jest.fn().mockResolvedValue({ok:true,body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(raw));c.close();}})});
 const result=await runChatEngine({expertId:"ada-owner",query:"view",chatHistory:[]});expect(result.verification.status).toBe("abstained");
});
test("EXP15 general discussion category survives chat SSE while unchecked factual prose does not", async()=>{
 retrieve.mockResolvedValue({version:"intent-evidence-v1",plan:{intent:"factual"},sources:[],evidenceTrace:[],temporalTrace:{stances:[],supersededStances:[],relations:[]},trace:{failures:[]},prompt:"bounded",gaps:[]});
 const run=async(draft:string)=>{
  const raw='data: '+JSON.stringify({choices:[{delta:{content:draft}}]})+'\n\ndata: [DONE]\n\n';
  global.fetch=jest.fn().mockResolvedValue({ok:true,body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(raw));c.close();}})});
  const result=await runChatEngine({expertId:"ada-owner",query:"Explain research methods",chatHistory:[]});
  return {result, output:await new Response(result.stream).text()};
 };
 const accepted=await run('{"spanIds":[],"segments":[{"category":"general-information","id":"research-design"}]}');
 expect(accepted.result.verification.status).toBe('verified');expect(accepted.output).toContain('not an attributed expert view');expect(accepted.output).toContain('association alone does not establish causation');
 // Frozen chat passed through provider prose. This same provider fixture must now fail closed.
 const unchecked=await run('The expert proved that every observational study establishes causation.');
 expect(unchecked.result.verification.status).toBe('abstained');expect(unchecked.output).not.toContain('every observational');
});
