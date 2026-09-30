import prisma, { resetAllMocks } from "../mocks/prisma";
const index=jest.fn();const remove=jest.fn();
jest.mock("@/lib/prisma",()=>({__esModule:true,default:prisma}));
jest.mock("@/lib/vector/indexer",()=>({indexDocument:index,removeDocument:remove,plannedVectorIds:()=>["planned"]}));
import { performIndexJob, removeKnowledgeItem, syncPostSource } from "@/lib/knowledge/lifecycle";
const syncKnowledgeItem = async (expertProfileId:string,itemId:string) => {
 if (!row || row.expertProfileId !== expertProfileId) return null;
 await performIndexJob({expertProfileId,itemId,sourceVersion:row.sourceVersion,namespace:"ada-ns",vectorIds:["planned"]} as never);
 return row;
};
type Row = ReturnType<typeof makeRow>;
let row: Row | null; // State-machine fixture, never a database.
const makeRow=()=>({id:"source",expertProfileId:"ada",title:"Title",content:"Old text",sourceType:"manual",sourceId:null as string | null,sourceVersion:1,indexedVersion:null as number | null,isIndexed:false,indexingError:null as string | null,vectorIds:[] as string[],metadata:{audience:"public"},expertProfile:{vectorNamespace:"ada-ns"}});
beforeEach(()=>{
 resetAllMocks();index.mockReset();remove.mockReset();row=makeRow();
 prisma.knowledgeLifecycleJob.upsert.mockImplementation(async({create}:{create:object})=>create);
 prisma.knowledgeLifecycleJob.updateMany.mockResolvedValue({count:1});
 prisma.knowledgeLifecycleJob.findUnique.mockImplementation(async()=>null);
 prisma.knowledgeItem.findUnique.mockImplementation(async()=>row?{...row}:null);
 prisma.knowledgeItem.updateMany.mockImplementation(async({where,data}:{where:{expertProfileId:string;sourceVersion:number};data:Partial<Row>})=>{
   if(!row || row.expertProfileId!==where.expertProfileId || row.sourceVersion!==where.sourceVersion)return {count:0};Object.assign(row,data);return {count:1};
 });
 prisma.knowledgeItem.deleteMany.mockImplementation(async()=>{row=null;return {count:1};});
 index.mockResolvedValue(["ada:source:v1:chunk_0"]);remove.mockResolvedValue(undefined);
});
test("EXP9 create carries authoritative tenant/source/version metadata and publishes only after indexing",async()=>{
 await syncKnowledgeItem("ada","source");
 expect(index).toHaveBeenCalledWith("ada-ns","source","Title\n\nOld text",expect.objectContaining({expertProfileId:"ada",knowledgeItemId:"source",sourceVersion:1,title:"Title"}));
 expect(row).toMatchObject({isIndexed:true,indexedVersion:1,indexingError:null});
});
test("duplicate/replayed events are idempotent",async()=>{
 await syncKnowledgeItem("ada","source");await syncKnowledgeItem("ada","source");expect(index).toHaveBeenCalledTimes(1);
});
test("new version/title-only edit replaces old manifest and cleans old vectors",async()=>{
 await syncKnowledgeItem("ada","source");Object.assign(row!,{title:"New title",sourceVersion:2,isIndexed:false});index.mockResolvedValue(["ada:source:v2:chunk_0"]);
 await syncKnowledgeItem("ada","source");expect(index).toHaveBeenLastCalledWith("ada-ns","source","New title\n\nOld text",expect.objectContaining({sourceVersion:2}));
 expect(prisma.knowledgeLifecycleJob.upsert).toHaveBeenCalledWith(expect.objectContaining({create:expect.objectContaining({kind:"CLEANUP",vectorIds:["ada:source:v1:chunk_0"]})}));expect(row!.indexedVersion).toBe(2);
});
test("delayed old completion cannot overwrite a newer revision",async()=>{
 let finish:(ids:string[])=>void=()=>{};index.mockImplementationOnce(()=>new Promise<string[]>((resolve)=>{finish=resolve;}));
 const old=syncKnowledgeItem("ada","source");await Promise.resolve();Object.assign(row!,{sourceVersion:2,content:"New text",isIndexed:false});
 index.mockResolvedValue(["ada:source:v2:chunk_0"]);await syncKnowledgeItem("ada","source");finish(["ada:source:v1:chunk_0"]);await old;
 expect(row).toMatchObject({content:"New text",indexedVersion:2,vectorIds:["ada:source:v2:chunk_0"]});
});
test("delete while indexing cannot resurrect the source",async()=>{
 let finish:(ids:string[])=>void=()=>{};index.mockImplementationOnce(()=>new Promise<string[]>((resolve)=>{finish=resolve;}));const pending=syncKnowledgeItem("ada","source");await Promise.resolve();
 await removeKnowledgeItem("ada","source");finish(["ada:source:v1:chunk_0"]);await pending;expect(row).toBeNull();
});
test("provider failure is visible and a retry publishes the same current version",async()=>{
 index.mockRejectedValueOnce(new Error("provider outage"));await expect(syncKnowledgeItem("ada","source")).rejects.toThrow("provider outage");expect(row).toMatchObject({isIndexed:false,indexingError:"provider outage"});
 await syncKnowledgeItem("ada","source");expect(row).toMatchObject({isIndexed:true,indexingError:null,indexedVersion:1});
});
test("wrong tenant cannot index or delete",async()=>{await syncKnowledgeItem("ben","source");await removeKnowledgeItem("ben","source");expect(index).not.toHaveBeenCalled();expect(prisma.knowledgeItem.deleteMany).not.toHaveBeenCalled();});
test("revocation happens before failed vector cleanup",async()=>{row!.vectorIds=["old"];remove.mockRejectedValue(new Error("cleanup failed"));await removeKnowledgeItem("ada","source");expect(row).toBeNull();expect(remove).not.toHaveBeenCalled();expect(prisma.knowledgeLifecycleJob.upsert).toHaveBeenCalledWith(expect.objectContaining({create:expect.objectContaining({kind:"CLEANUP",vectorIds:["old"]})}));});
test("post edit/visibility change updates a unique authoritative source",async()=>{
 const post={id:"post",authorId:"ada-owner",title:"New title",content:"New body",status:"DRAFT",isHidden:true,isPremiumOnly:true,isRagEnabled:true};
 Object.assign(row!,{sourceType:"post",sourceId:"post"});prisma.post.findUnique.mockResolvedValue(post);prisma.expertProfile.findUnique.mockResolvedValue({id:"ada",vectorNamespace:"ada-ns"});
 prisma.knowledgeItem.upsert.mockImplementation(async({update}:{update:Record<string,unknown>})=>{Object.assign(row!,update,{sourceVersion:2});return row;});
 await syncPostSource("post");expect(prisma.knowledgeItem.upsert).toHaveBeenCalledWith(expect.objectContaining({where:{expertProfileId_sourceType_sourceId:{expertProfileId:"ada",sourceType:"post",sourceId:"post"}},update:expect.objectContaining({title:"New title",content:"New body",isIndexed:false,sourceVersion:{increment:1}})}));
});
test("disabling post RAG retracts its source",async()=>{prisma.post.findUnique.mockResolvedValue({id:"post",authorId:"ada-owner",isRagEnabled:false});prisma.expertProfile.findUnique.mockResolvedValue({id:"ada"});await syncPostSource("post");expect(row).toBeNull();});
