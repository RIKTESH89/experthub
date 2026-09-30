const store={query:jest.fn(),keywordSearch:jest.fn(),upsert:jest.fn(),deleteByIds:jest.fn()};
const embedding=jest.fn();
jest.mock("@/lib/vector/client",()=>({vectorStore:store}));
jest.mock("@/lib/vector/embeddings",()=>({generateEmbedding:embedding}));
import { retrieveContext } from "@/lib/vector/retriever";
const result=(id:string,score=0.8,expert="ada")=>({id,content:id,score,metadata:{expertProfileId:expert}});
const scope={expertProfileId:"ada",namespace:"ada-ns",isOwner:false,allowedVectorIds:Array.from({length:15},(_,i)=>`vector-${i}`).concat(["keyword-only","duplicate"])};
beforeEach(()=>{jest.clearAllMocks();embedding.mockResolvedValue([1]);store.query.mockResolvedValue([]);store.keywordSearch.mockResolvedValue([]);delete process.env.OPENAI_API_KEY;});
afterEach(()=>{delete process.env.OPENAI_API_KEY;});
test("EXP11 keyword-only hit enters reranking budget with a full vector channel",async()=>{
 store.query.mockResolvedValue(Array.from({length:15},(_,i)=>result(`vector-${i}`)));
 store.keywordSearch.mockResolvedValue([result("keyword-only")]);
 process.env.OPENAI_API_KEY="synthetic-only";
 global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:"2,1,3,4,5"}}]})});
 const results=await retrieveContext("ada-ns","rare-tool",5,scope);
 const body=JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
 expect(body.messages[1].content).toContain("keyword-only");expect(results[0].content).toBe("keyword-only");
});
test("embedding outage preserves keyword retrieval and emits explicit diagnostics",async()=>{
 embedding.mockRejectedValue(new Error("provider outage"));store.keywordSearch.mockResolvedValue([result("keyword-only")]);const diagnostic=jest.fn();
 expect((await retrieveContext("ada-ns","rare-tool",5,scope,diagnostic)).map((r)=>r.content)).toEqual(["keyword-only"]);
 expect(store.query).not.toHaveBeenCalled();expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({vectorAvailable:false,keywordCandidates:1,eligibleCandidates:1,retrievalMs:expect.any(Number)}));
});
test("union deduplicates deterministically and excludes unauthorized/foreign hits before rerank",async()=>{
 store.query.mockResolvedValue([result("duplicate"),result("PRIVATE_SENTINEL"),result("keyword-only",0.9,"ben")]);
 store.keywordSearch.mockResolvedValue([result("duplicate"),result("keyword-only")]);
 const first=await retrieveContext("ada-ns","query",5,scope);const second=await retrieveContext("ada-ns","query",5,scope);
 expect(first).toEqual(second);expect(first.map((r)=>r.content)).toEqual(["duplicate","keyword-only"]);
});
test("unscoped retrieval fails closed",async()=>{await expect(retrieveContext("ada-ns","query")).rejects.toThrow("authorized scope");expect(embedding).not.toHaveBeenCalled();});
