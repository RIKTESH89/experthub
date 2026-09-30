import prisma,{resetAllMocks} from "../mocks/prisma";
jest.mock("@/lib/prisma",()=>({__esModule:true,default:prisma}));
import {vectorStore} from "@/lib/vector/client";
import {EMBEDDING_DIMENSIONS,EMBEDDING_MODEL} from "@/lib/vector/embeddings";
const scope={expertProfileId:"ada",namespace:"ada-ns",isOwner:false,allowedVectorIds:["ada:public"]};
const vector=Array.from({length:EMBEDDING_DIMENSIONS},(_,i)=>i===0?1:0);
beforeEach(()=>{resetAllMocks();prisma.$queryRawUnsafe.mockResolvedValue([]);});
test("EXP8 tenant and live allowed IDs constrain vector SQL before ranking/limit",async()=>{
 await vectorStore.query("ada-ns",vector,5,scope);const [sql,...parameters]=prisma.$queryRawUnsafe.mock.calls[0];
 expect(sql.indexOf('"vectorId" = ANY')).toBeLessThan(sql.indexOf('LIMIT'));expect(sql).toContain('"metadata"->>\'expertProfileId\' = $5');
 expect(parameters.slice(3)).toEqual([scope.allowedVectorIds,"ada",EMBEDDING_MODEL]);
});
test("keyword full-text and substring paths both prefilter tenant and source IDs",async()=>{
 await vectorStore.keywordSearch("ada-ns","rare-tool",15,scope);expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
 for(const [sql,...params] of prisma.$queryRawUnsafe.mock.calls){expect(sql.indexOf('"vectorId" = ANY')).toBeLessThan(sql.indexOf('LIMIT'));expect(params.slice(-2)).toEqual([scope.allowedVectorIds,"ada"]);}
});
test("wrong namespace or absent scope never queries storage",async()=>{await vectorStore.query("ben-ns",vector,5,scope);await vectorStore.keywordSearch("ada-ns","secret");expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();});
test("wrong-dimensional vectors and mismatched models never reach SQL",async()=>{
 await expect(vectorStore.query("ada-ns",[1],5,scope)).rejects.toThrow("mismatch");
 await expect(vectorStore.upsert("ada-ns",[{id:"id",values:vector,content:"secret",metadata:{embeddingModel:"different"}}])).rejects.toThrow("model mismatch");expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
});
