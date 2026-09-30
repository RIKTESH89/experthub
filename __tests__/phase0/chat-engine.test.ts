import prisma,{resetAllMocks} from "../mocks/prisma";
const retrieve=jest.fn();const memories=jest.fn();const graph=jest.fn();
jest.mock("@/lib/prisma",()=>({__esModule:true,default:prisma}));
jest.mock("@/lib/vector/retriever",()=>({retrieveContext:retrieve}));
jest.mock("@/lib/ai/memory-manager",()=>({getMemories:memories}));
jest.mock("@/lib/graph/graph-retriever",()=>({graphEnhancedRetrieval:graph}));
import {runChatEngine} from "@/lib/ai/chat-engine";
beforeEach(()=>{
 resetAllMocks();retrieve.mockReset();memories.mockReset();graph.mockReset();prisma.expertProfile.findUnique.mockResolvedValue({id:"ada",userId:"ada-owner",displayName:"Ada",vectorNamespace:"ada-ns",ragEnabled:true,personalityProfile:{tone:"PRIVATE_STYLE_SENTINEL"}});
 prisma.knowledgeItem.findMany.mockResolvedValue([]);prisma.expertSubscription.findUnique.mockResolvedValue(null);retrieve.mockResolvedValue([]);memories.mockResolvedValue([]);
 global.fetch=jest.fn().mockResolvedValue({ok:true,body:new ReadableStream({start(c){c.close();}})});
});
test("EXP8 public generation never consumes legacy private personality or graph summaries",async()=>{
 await runChatEngine({expertId:"ada-owner",query:"question",chatHistory:[]});expect(graph).not.toHaveBeenCalled();expect(memories).not.toHaveBeenCalled();
 const body=JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);expect(JSON.stringify(body)).not.toContain("PRIVATE_STYLE_SENTINEL");expect(body.messages[0].content).toContain("not the actual person");
 expect(retrieve).toHaveBeenCalledWith("ada-ns","question",5,expect.objectContaining({isOwner:false,allowedVectorIds:[]}));
});
test("permission failure prevents retrieval, memory and generation",async()=>{
 prisma.expertSubscription.findUnique.mockRejectedValue(new Error("permission unavailable"));await expect(runChatEngine({expertId:"ada-owner",subscriberId:"visitor",query:"question",chatHistory:[]})).rejects.toThrow("permission unavailable");expect(retrieve).not.toHaveBeenCalled();expect(memories).not.toHaveBeenCalled();expect(global.fetch).not.toHaveBeenCalled();
});
test("memory reads use authenticated visitor and selected expert only",async()=>{await runChatEngine({expertId:"ada-owner",subscriberId:"visitor-a",query:"question",chatHistory:[]});expect(memories).toHaveBeenCalledWith("visitor-a","ada",15);});
