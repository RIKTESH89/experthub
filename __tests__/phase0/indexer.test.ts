const store={upsert:jest.fn(),deleteByIds:jest.fn()};const embed=jest.fn();
jest.mock("@/lib/vector/client",()=>({vectorStore:store}));
jest.mock("@/lib/vector/embeddings",()=>({generateEmbedding:embed,EMBEDDING_MODEL:"text-embedding-3-small"}));
import {indexDocument} from "@/lib/vector/indexer";
beforeEach(()=>{jest.clearAllMocks();embed.mockReset();embed.mockResolvedValue([1]);});
const metadata={expertProfileId:"ada",knowledgeItemId:"source",sourceVersion:2};
test("source identity and revision make retries deterministic and experts distinct",async()=>{
 const first=await indexDocument("ada-ns","source","text",metadata);const second=await indexDocument("ada-ns","source","text",metadata);
 expect(first).toEqual(second);expect(first).toEqual(["ada:source:v2:chunk_0"]);
 expect(await indexDocument("ben-ns","source","text",{...metadata,expertProfileId:"ben"})).toEqual(["ben:source:v2:chunk_0"]);
});
test("partial embedding failure cannot publish partial persistent vectors",async()=>{
 embed.mockResolvedValueOnce([1]).mockRejectedValueOnce(new Error("outage"));await expect(indexDocument("ada-ns","source","a".repeat(1400),metadata)).rejects.toThrow("outage");expect(store.upsert).not.toHaveBeenCalled();
});
test("missing authoritative source metadata fails before provider calls",async()=>{await expect(indexDocument("ada-ns","source","text",{})).rejects.toThrow("identity");expect(embed).not.toHaveBeenCalled();});
