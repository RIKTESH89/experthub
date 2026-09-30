import prisma,{resetAllMocks} from "../mocks/prisma";
import type { KnowledgeLifecycleJob } from "@prisma/client";
const remove=jest.fn();const index=jest.fn();
jest.mock("@/lib/prisma",()=>({__esModule:true,default:prisma}));
jest.mock("@/lib/vector/indexer",()=>({removeDocument:remove,indexDocument:index,plannedVectorIds:()=>["planned"]}));
import {enqueueLifecycleJob,runLifecycleJob} from "@/lib/knowledge/outbox";
import {removeKnowledgeItem,drainLifecycleJobs,syncKnowledgeItem,withPostOutbox} from "@/lib/knowledge/lifecycle";
let jobs:Map<string,KnowledgeLifecycleJob>;
let source:Record<string,unknown>|null;
const now=new Date();
const work={kind:"CLEANUP",expertProfileId:"ada",itemId:"source",sourceVersion:1,namespace:"ada-ns",vectorIds:["orphan"]};
beforeEach(()=>{
 resetAllMocks();remove.mockReset().mockResolvedValue(undefined);index.mockReset().mockResolvedValue(["planned"]);jobs=new Map();source=null;
 prisma.knowledgeLifecycleJob.upsert.mockImplementation(async({where,create}:{where:{id:string};create:KnowledgeLifecycleJob})=>{
  if(!jobs.has(where.id))jobs.set(where.id,Object.assign({state:"PENDING",attempts:0,availableAt:now,leaseUntil:null,leaseToken:null,lastError:null,createdAt:now,updatedAt:now},create));return {...jobs.get(where.id)};
 });
 prisma.knowledgeLifecycleJob.findUnique.mockImplementation(async({where}:{where:{id:string}})=>jobs.get(where.id)?{...jobs.get(where.id)}:null);
 prisma.knowledgeLifecycleJob.updateMany.mockImplementation(async({where,data}:{where:Record<string,unknown>;data:Record<string,unknown>})=>{
  const job=jobs.get(where.id as string);if(!job)return {count:0};
  if(where.expertProfileId && where.expertProfileId!==job.expertProfileId)return {count:0};
  if(where.state && where.state!==job.state)return {count:0};
  if(where.leaseToken && where.leaseToken!==job.leaseToken)return {count:0};
  if(where.OR && (job.state==="DONE" || job.availableAt>(where.availableAt as {lte:Date}).lte || (job.state==="RUNNING" && job.leaseUntil!>(where.availableAt as {lte:Date}).lte)))return {count:0};
  const attempts=data.attempts?job.attempts+1:job.attempts;Object.assign(job,data,{attempts});return {count:1};
 });
 prisma.knowledgeLifecycleJob.findMany.mockImplementation(async({where}:{where:{expertProfileId:string;availableAt:{lte:Date}}})=>Array.from(jobs.values()).filter(j=>j.expertProfileId===where.expertProfileId&&j.state!=="DONE"&&j.availableAt<=where.availableAt.lte));
 prisma.knowledgeItem.findUnique.mockImplementation(async()=>source?{...source}:null);
 prisma.knowledgeItem.findMany.mockResolvedValue([]);
 prisma.knowledgeItem.deleteMany.mockImplementation(async()=>{source=null;return {count:1};});
 prisma.knowledgeItem.updateMany.mockImplementation(async({data}:{data:object})=>{if(!source)return {count:0};Object.assign(source,data);return {count:1};});
});
test("duplicate events persist one job with stable sorted ID",async()=>{const a=await enqueueLifecycleJob({...work,vectorIds:["b","a","a"]});const b=await enqueueLifecycleJob({...work,vectorIds:["a","b"]});expect(a.id).toBe(b.id);expect(jobs.size).toBe(1);});
test("deleted source cleanup survives failure, backoff and replay",async()=>{
 source={id:"source",expertProfileId:"ada",sourceVersion:1,vectorIds:["orphan"],expertProfile:{vectorNamespace:"ada-ns"}};
 await removeKnowledgeItem("ada","source");expect(source).toBeNull();const job=Array.from(jobs.values())[0];
 remove.mockRejectedValueOnce(new Error("DB outage"));await expect(runLifecycleJob(job.id,"ada",async()=>{},now)).rejects.toThrow("DB outage");
 expect(jobs.get(job.id)).toMatchObject({state:"PENDING",attempts:1,lastError:"DB outage"});
 expect(await runLifecycleJob(job.id,"ada",async()=>{},now)).toBe(false);
 await drainLifecycleJobs("ada",20,new Date(now.getTime()+60_000));expect(jobs.get(job.id)?.state).toBe("DONE");expect(remove).toHaveBeenLastCalledWith("ada-ns",["orphan"]);
});
test("wrong expert cannot claim cleanup",async()=>{const job=await enqueueLifecycleJob(work);expect(await runLifecycleJob(job.id,"ben",async()=>{},now)).toBe(false);expect(remove).not.toHaveBeenCalled();});
test("current manifest IDs are protected during cleanup",async()=>{source={expertProfileId:"ada",vectorIds:["current"]};const job=await enqueueLifecycleJob({...work,vectorIds:["current","orphan"]});await runLifecycleJob(job.id,"ada",async()=>{},now);expect(remove).toHaveBeenCalledWith("ada-ns",["orphan"]);});
test("worker crash lease expires and work is reclaimed",async()=>{const job=await enqueueLifecycleJob(work);Object.assign(jobs.get(job.id)!,{state:"RUNNING",leaseToken:"crashed",leaseUntil:new Date(now.getTime()+1000)});expect(await runLifecycleJob(job.id,"ada",async()=>{},now)).toBe(false);expect(await runLifecycleJob(job.id,"ada",async()=>{},new Date(now.getTime()+2000))).toBe(true);});
test("expired worker cannot acknowledge a replacement lease",async()=>{const job=await enqueueLifecycleJob({...work,kind:"INDEX"});await runLifecycleJob(job.id,"ada",async()=>{Object.assign(jobs.get(job.id)!,{leaseToken:"replacement",state:"RUNNING"});},now);expect(jobs.get(job.id)).toMatchObject({leaseToken:"replacement",state:"RUNNING"});});
test("late orphan recreation rearms completed cleanup",async()=>{const job=await enqueueLifecycleJob(work);await runLifecycleJob(job.id,"ada",async()=>{},now);await enqueueLifecycleJob(work);expect(jobs.get(job.id)?.state).toBe("PENDING");});
test("crash between source creation and enqueue is reconciled",async()=>{
 source={id:"source",expertProfileId:"ada",title:"Title",content:"Body",sourceVersion:1,indexedVersion:null,isIndexed:false,vectorIds:[],metadata:{},expertProfile:{vectorNamespace:"ada-ns"}};
 prisma.knowledgeItem.findMany.mockResolvedValue([source]);await drainLifecycleJobs("ada",20,new Date(now.getTime()+60_000));expect(source).toMatchObject({indexedVersion:1,isIndexed:true});expect(index).toHaveBeenCalledTimes(1);
});
test("index outbox is persisted before external work; error remains retryable",async()=>{
 source={id:"source",expertProfileId:"ada",title:"Title",content:"Body",sourceVersion:1,indexedVersion:null,isIndexed:false,vectorIds:[],metadata:{},expertProfile:{vectorNamespace:"ada-ns"}};
 index.mockImplementationOnce(async()=>{expect(Array.from(jobs.values()).some(j=>j.kind==="INDEX")).toBe(true);throw new Error("provider down");});
 await expect(syncKnowledgeItem("ada","source")).rejects.toThrow("provider down");expect(Array.from(jobs.values())[0]).toMatchObject({state:"PENDING",lastError:"provider down"});
});
test("deleted source with in-flight staged IDs creates durable cleanup on replay",async()=>{const job=await enqueueLifecycleJob({...work,kind:"INDEX",vectorIds:["staged"]});await drainLifecycleJobs("ada",20,new Date(now.getTime()+60_000));expect(Array.from(jobs.values())).toContainEqual(expect.objectContaining({kind:"CLEANUP",vectorIds:["staged"],state:"PENDING"}));expect(jobs.get(job.id)?.state).toBe("DONE");});

test("outbox persistence failure prevents deletion and external cleanup",async()=>{
 source={id:"source",expertProfileId:"ada",sourceVersion:1,vectorIds:["orphan"],expertProfile:{vectorNamespace:"ada-ns"}};
 prisma.knowledgeLifecycleJob.upsert.mockRejectedValue(new Error("outbox unavailable"));
 await expect(removeKnowledgeItem("ada","source")).rejects.toThrow("outbox unavailable");
 expect(source).not.toBeNull();expect(prisma.knowledgeItem.deleteMany).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();
});

test("post mutation records a durable projection event in the same transaction",async()=>{
 prisma.expertProfile.findUnique.mockResolvedValue({id:"ada",vectorNamespace:"ada-ns"});
 prisma.post.update.mockResolvedValue({id:"post"});
 await withPostOutbox("ada-owner",tx=>tx.post.update({where:{id:"post"},data:{isHidden:true}}));
 expect(Array.from(jobs.values())).toContainEqual(expect.objectContaining({kind:"POST_SYNC",expertProfileId:"ada",itemId:"post",state:"PENDING"}));
});
test("post change during an active worker invalidates its lease and rearms replay",async()=>{
 const job=await enqueueLifecycleJob({...work,kind:"POST_SYNC",vectorIds:[]});
 Object.assign(jobs.get(job.id)!,{state:"RUNNING",leaseToken:"old-worker"});
 await enqueueLifecycleJob({...work,kind:"POST_SYNC",vectorIds:[]});
 expect(jobs.get(job.id)).toMatchObject({state:"PENDING",leaseToken:null});
});
