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
