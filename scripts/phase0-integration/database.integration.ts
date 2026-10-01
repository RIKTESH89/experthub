import {writeFileSync,readFileSync} from "fs";
import prisma from "@/lib/prisma";
const embed=jest.fn(async():Promise<number[]>=>Array.from({length:1536},(_,i)=>i===0?1:0));
jest.mock("@/lib/vector/embeddings",()=>{const actual=jest.requireActual("@/lib/vector/embeddings");return {...actual,generateEmbedding:embed};});
import {syncKnowledgeItem,removeKnowledgeItem,drainLifecycleJobs,withPostOutbox,syncPostSource} from "@/lib/knowledge/lifecycle";
import {enqueueLifecycleJob,runLifecycleJob} from "@/lib/knowledge/outbox";
import {resolveRetrievalScope} from "@/lib/knowledge/access";
import {vectorStore} from "@/lib/vector/client";
import {saveMemories,getMemories} from "@/lib/ai/memory-manager";
import {createLocalScheduler,localRuntimeClock} from "@/lib/knowledge/local-scheduler";
const owner="synthetic-owner";const expert="synthetic-ada";const ns="synthetic-ada-ns";
async function source(id="source",audience="public"){return prisma.knowledgeItem.create({data:{id,expertProfileId:expert,title:"Synthetic title",content:"Synthetic architecture decision evidence",sourceType:"manual",metadata:{audience},vectorIds:[]}});}
beforeEach(async()=>{
 const db=await prisma.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;
 if(db[0].name!=="experthub_phase0_test")throw new Error("Unsafe integration DB");
 await prisma.$executeRawUnsafe('TRUNCATE "KnowledgeLifecycleJob", "VectorChunk", "User" CASCADE');
 await prisma.user.create({data:{id:owner,email:"synthetic-owner@example.invalid",role:"EXPERT",expertProfile:{create:{id:expert,displayName:"Synthetic Ada",specialty:[],vectorNamespace:ns}}}});
 embed.mockReset().mockResolvedValue(Array.from({length:1536},(_,i)=>i===0?1:0));
});
afterAll(async()=>{await prisma.$disconnect();});
test("real PostgreSQL/pgvector migrations and transactional rollback",async()=>{
 const extensions=await prisma.$queryRaw<{extversion:string}[]>`SELECT extversion FROM pg_extension WHERE extname='vector'`;expect(extensions[0].extversion).toBe("0.8.6");
 await expect(prisma.$transaction(async tx=>{await tx.knowledgeItem.create({data:{id:"rollback",expertProfileId:expert,title:"x",content:"x",sourceType:"manual",vectorIds:[]}});throw new Error("rollback");})).rejects.toThrow("rollback");expect(await prisma.knowledgeItem.findUnique({where:{id:"rollback"}})).toBeNull();
});
test("index/replay/edit/delete persist manifests and clean orphan vectors",async()=>{
 await source();await syncKnowledgeItem(expert,"source");await syncKnowledgeItem(expert,"source");expect(embed).toHaveBeenCalledTimes(1);
 await prisma.knowledgeItem.update({where:{id:"source"},data:{sourceVersion:{increment:1},isIndexed:false,content:"Updated synthetic architecture"}});await syncKnowledgeItem(expert,"source");
 await drainLifecycleJobs(expert,20,new Date(Date.now()+60000));expect(await prisma.$queryRaw<{count:bigint}[]>`SELECT count(*) AS count FROM "VectorChunk"`).toEqual([{count:BigInt(1)}]);
 await removeKnowledgeItem(expert,"source");expect(await prisma.knowledgeItem.count()).toBe(0);expect(await prisma.knowledgeLifecycleJob.count({where:{kind:"CLEANUP",state:"PENDING"}})).toBeGreaterThan(0);
 await drainLifecycleJobs(expert,20,new Date(Date.now()+60000));expect(await prisma.$queryRaw<{count:bigint}[]>`SELECT count(*) AS count FROM "VectorChunk"`).toEqual([{count:BigInt(0)}]);
});
test("real delayed indexing CAS cannot publish stale source revision",async()=>{
 await source();let finish:(v:number[])=>void=()=>{};let started:()=>void=()=>{};const ready=new Promise<void>(r=>{started=r;});embed.mockImplementationOnce(()=>{started();return new Promise<number[]>(r=>{finish=r;});});const old=syncKnowledgeItem(expert,"source");await ready;
 await prisma.knowledgeItem.update({where:{id:"source"},data:{sourceVersion:2,isIndexed:false,content:"New synthetic evidence"}});await syncKnowledgeItem(expert,"source");finish(Array.from({length:1536},(_,i)=>i===0?1:0));await old;await drainLifecycleJobs(expert,20,new Date(Date.now()+60000));
 const row=await prisma.knowledgeItem.findUniqueOrThrow({where:{id:"source"}});expect(row.indexedVersion).toBe(2);expect(row.vectorIds).toEqual([`${expert}:source:v2:chunk_0`]);
});
test("real deletion while embeddings run never resurrects manifest or orphan vectors",async()=>{
 await source();let finish:(v:number[])=>void=()=>{};let started:()=>void=()=>{};const ready=new Promise<void>(r=>{started=r;});embed.mockImplementationOnce(()=>{started();return new Promise<number[]>(r=>{finish=r;});});const pending=syncKnowledgeItem(expert,"source");await ready;await removeKnowledgeItem(expert,"source");finish(Array.from({length:1536},(_,i)=>i===0?1:0));await pending;await drainLifecycleJobs(expert,20,new Date(Date.now()+60000));expect(await prisma.knowledgeItem.count()).toBe(0);expect(await prisma.$queryRaw<{count:bigint}[]>`SELECT count(*) AS count FROM "VectorChunk"`).toEqual([{count:BigInt(0)}]);
});
test("real competing workers claim once and expired lease recovers after restart",async()=>{
 const job=await enqueueLifecycleJob({kind:"INDEX",expertProfileId:expert,itemId:"missing",sourceVersion:1,namespace:ns,vectorIds:[]});const handler=jest.fn(async()=>{});const now=new Date(Date.now()+60000);
 const results=await Promise.all([runLifecycleJob(job.id,expert,handler,now),runLifecycleJob(job.id,expert,handler,now)]);expect(results.filter(Boolean)).toHaveLength(1);expect(handler).toHaveBeenCalledTimes(1);
 await prisma.knowledgeLifecycleJob.update({where:{id:job.id},data:{state:"RUNNING",leaseToken:"crashed",leaseUntil:new Date(0)}});await drainLifecycleJobs(expert,20,now);expect((await prisma.knowledgeLifecycleJob.findUniqueOrThrow({where:{id:job.id}})).state).toBe("DONE");
});
test("provider failure persists backoff and scheduler restart drains recovered work",async()=>{
 await source();embed.mockRejectedValueOnce(new Error("synthetic embedding outage"));await expect(syncKnowledgeItem(expert,"source")).rejects.toThrow("outage");expect(await prisma.knowledgeLifecycleJob.count({where:{state:"PENDING",lastError:{not:null}}})).toBe(1);
 const options={syntheticExpertIds:[expert],drain:drainLifecycleJobs,clock:{now:()=>new Date(Date.now()+60000),setTimeout:()=>0,clearTimeout:()=>{}}};const first=createLocalScheduler(options);await first.shutdown();const restart=createLocalScheduler(options);await restart.tick();await restart.shutdown();expect((await prisma.knowledgeItem.findUniqueOrThrow({where:{id:"source"}})).isIndexed).toBe(true);
});
test("actual SQL filters tenant/audience before topK and keyword ranking",async()=>{
 await source("public");await source("private","private");await syncKnowledgeItem(expert,"public");await syncKnowledgeItem(expert,"private");
 await prisma.user.create({data:{id:"synthetic-ben-owner",email:"ben@example.invalid",role:"EXPERT",expertProfile:{create:{id:"synthetic-ben",displayName:"Synthetic Ben",specialty:[],vectorNamespace:"ben-ns"}}}});
 await prisma.knowledgeItem.create({data:{id:"ben",expertProfileId:"synthetic-ben",title:"x",content:"Synthetic architecture",sourceType:"manual",metadata:{audience:"public"},vectorIds:[]}});await syncKnowledgeItem("synthetic-ben","ben");
 const scope=await resolveRetrievalScope(expert,ns,owner);expect(scope.allowedVectorIds).toEqual([`${expert}:public:v1:chunk_0`]);
 expect((await vectorStore.query(ns,await embed(),1,scope)).map(r=>r.id)).toEqual(scope.allowedVectorIds);expect((await vectorStore.keywordSearch(ns,"architecture",1,scope)).map(r=>r.id)).toEqual(scope.allowedVectorIds);
 expect(await vectorStore.query("ben-ns",await embed(),1,scope)).toEqual([]);
});
test("post mutation and durable event roll back together on transaction error",async()=>{
 const post=await prisma.post.create({data:{id:"post",authorId:owner,title:"Synthetic",content:"Original",status:"PUBLISHED",isRagEnabled:true}});
 await expect(withPostOutbox(owner,async tx=>{await tx.post.update({where:{id:post.id},data:{content:"bad edit"}});throw new Error("synthetic rollback");})).rejects.toThrow("rollback");expect((await prisma.post.findUniqueOrThrow({where:{id:post.id}})).content).toBe("Original");expect(await prisma.knowledgeLifecycleJob.count()).toBe(0);
 await withPostOutbox(owner,tx=>tx.post.update({where:{id:post.id},data:{content:"Synthetic updated"}}));await drainLifecycleJobs(expert,20,new Date(Date.now()+60000));expect(await prisma.knowledgeItem.count({where:{sourceId:post.id}})).toBe(1);
});

describe.each(["synthetic-ada","synthetic-ben"])("real access matrix %s",(target)=>{
 test.each(["anonymous","ordinary","entitled","owner"])("%s",async(role)=>{
  const targetOwner=target==="synthetic-ada"?owner:"synthetic-ben-owner";const namespace=target+"-ns";
  if(target!==expert)await prisma.user.create({data:{id:targetOwner,email:"ben@example.invalid",role:"EXPERT",expertProfile:{create:{id:target,displayName:"Synthetic Ben",specialty:[],vectorNamespace:namespace}}}});
  const actualNs=target===expert?ns:namespace;
  for(const [id,audience] of [["public","public"],["premium","premium"],["private","private"]]){
   await prisma.knowledgeItem.create({data:{id,expertProfileId:target,title:id,content:"architecture synthetic "+id,sourceType:"manual",metadata:{audience},vectorIds:[]}});await syncKnowledgeItem(target,id);
  }
  for(const id of ["published","draft","hidden","paid"]){await prisma.post.create({data:{id,authorId:targetOwner,title:id,content:"architecture synthetic "+id,status:id==="draft"?"DRAFT":"PUBLISHED",isHidden:id==="hidden",isPremiumOnly:id==="paid",isRagEnabled:true}});await syncPostSource(id);}
  let viewer:string|undefined;
  if(role==="owner")viewer=targetOwner;
  else if(role!=="anonymous"){
   viewer="synthetic-visitor";await prisma.user.create({data:{id:viewer,email:"visitor@example.invalid"}});
   await prisma.expertSubscription.create({data:{subscriberId:viewer,expertProfileId:target,status:"ACTIVE",...syntheticPaidPeriod,tier:role==="entitled"?"PREMIUM":"STANDARD",price:0}});
  }
  const scope=await resolveRetrievalScope(target,actualNs,targetOwner,viewer);
  const expected=role==="owner"?7:role==="entitled"?4:2;expect(scope.allowedVectorIds).toHaveLength(expected);
  expect((await vectorStore.keywordSearch(actualNs,"architecture",20,scope))).toHaveLength(expected);
 });
});
test("actual warm permission downgrade, unpublish and source deletion revoke retrieval",async()=>{
 await prisma.user.create({data:{id:"synthetic-visitor",email:"visitor@example.invalid"}});
 const sub=await prisma.expertSubscription.create({data:{subscriberId:"synthetic-visitor",expertProfileId:expert,status:"ACTIVE",tier:"PREMIUM",...syntheticPaidPeriod,price:0}});
 await prisma.post.create({data:{id:"paid",authorId:owner,title:"Paid",content:"architecture synthetic paid",status:"PUBLISHED",isPremiumOnly:true,isRagEnabled:true}});await syncPostSource("paid");
 const resolve=()=>resolveRetrievalScope(expert,ns,owner,"synthetic-visitor");expect((await resolve()).allowedVectorIds).toHaveLength(1);
 await prisma.expertSubscription.update({where:{id:sub.id},data:{tier:"STANDARD"}});expect((await resolve()).allowedVectorIds).toHaveLength(0);
 await prisma.expertSubscription.update({where:{id:sub.id},data:{tier:"PREMIUM",...syntheticPaidPeriod}});await prisma.post.update({where:{id:"paid"},data:{status:"DRAFT"}});expect((await resolve()).allowedVectorIds).toHaveLength(0);
 await prisma.post.delete({where:{id:"paid"}});expect((await resolve()).allowedVectorIds).toHaveLength(0);
});
test("real deletion cleanup failure persists and retry removes orphan after source is gone",async()=>{
 await source();await syncKnowledgeItem(expert,"source");await removeKnowledgeItem(expert,"source");
 const spy=jest.spyOn(vectorStore,"deleteByIds").mockRejectedValueOnce(new Error("synthetic cleanup outage"));
 const now=new Date(Date.now()+60000);expect((await drainLifecycleJobs(expert,20,now)).failed).toBe(1);spy.mockRestore();
 await drainLifecycleJobs(expert,20,new Date(now.getTime()+60000));expect(await prisma.$queryRaw<{count:bigint}[]>`SELECT count(*) AS count FROM "VectorChunk"`).toEqual([{count:BigInt(0)}]);
});
test("concurrent exact memory retries are idempotent and experts/visitors are isolated",async()=>{
 await prisma.user.create({data:{id:"synthetic-visitor",email:"visitor@example.invalid"}});await prisma.user.create({data:{id:"synthetic-other",email:"other@example.invalid"}});
 await prisma.user.create({data:{id:"synthetic-ben-owner",email:"ben@example.invalid",role:"EXPERT",expertProfile:{create:{id:"synthetic-ben",displayName:"Synthetic Ben",specialty:[],vectorNamespace:"ben-ns"}}}});
 const memories=[{fact:"Synthetic preference for testing",category:"preference"}];
 await Promise.all([saveMemories("synthetic-visitor",expert,memories),saveMemories("synthetic-visitor",expert,memories)]);
 await saveMemories("synthetic-other",expert,memories);await saveMemories("synthetic-visitor","synthetic-ben",memories);
 expect(await prisma.subscriberMemory.count()).toBe(3);expect(await getMemories("synthetic-visitor",expert)).toHaveLength(1);
});
test("late worker cannot acknowledge replacement lease in real PostgreSQL",async()=>{
 const job=await enqueueLifecycleJob({kind:"INDEX",expertProfileId:expert,itemId:"missing",sourceVersion:1,namespace:ns,vectorIds:[]});
 let finish:()=>void=()=>{};let entered:()=>void=()=>{};const ready=new Promise<void>(r=>{entered=r;});const now=new Date(Date.now()+60000);
 const old=runLifecycleJob(job.id,expert,async()=>{entered();await new Promise<void>(r=>{finish=r;});},now);await ready;
 await prisma.knowledgeLifecycleJob.update({where:{id:job.id},data:{leaseUntil:new Date(0)}});await runLifecycleJob(job.id,expert,async()=>{},now);finish();await old;
 expect((await prisma.knowledgeLifecycleJob.findUniqueOrThrow({where:{id:job.id}})).state).toBe("DONE");
});

test("native local scheduler timer drains real durable work and shuts down",async()=>{
 await enqueueLifecycleJob({kind:"CLEANUP",expertProfileId:expert,itemId:"missing",sourceVersion:1,namespace:ns,vectorIds:[]});
 let done:()=>void=()=>{};const completed=new Promise<void>(r=>{done=r;});const runner=createLocalScheduler({syntheticExpertIds:[expert],clock:localRuntimeClock,drain:async(...args)=>{const result=await drainLifecycleJobs(...args);done();return result;}});
 runner.start();await completed;await runner.shutdown();expect(await prisma.knowledgeLifecycleJob.count({where:{state:"DONE"}})).toBe(1);
});
test("local SQL latency comparison records actual DB time with synthetic embeddings",async()=>{
 await source();await syncKnowledgeItem(expert,"source");const scope=await resolveRetrievalScope(expert,ns,owner);const v=await embed();const str="["+v.join(",")+"]";
 const baseline:number[]=[],phase0:number[]=[];
 for(let i=0;i<20;i++){
  let start=performance.now();await prisma.$queryRawUnsafe('SELECT "vectorId" FROM "VectorChunk" WHERE "namespace"=$1 ORDER BY "embedding" <=> $2::vector LIMIT 5',ns,str);baseline.push(performance.now()-start);
  start=performance.now();await vectorStore.query(ns,v,5,scope);phase0.push(performance.now()-start);
 }
 const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {medianMs:sorted[10],p95Ms:sorted[19],iterations:20};};
 writeFileSync(process.env.EXPERTHUB_AUDIT_DIR ? `${process.env.EXPERTHUB_AUDIT_DIR}/regression-phase0-localdb-latency.json` : "audit/phase0/localdb-latency.json",JSON.stringify({kind:"real local PostgreSQL SQL comparison, one synthetic vector",baseline:stats(baseline),phase0:stats(phase0),warning:"Includes different selected columns/client validation; not end-to-end latency or production performance/provider/model quality"},null,2));
});

test("ten concurrent enqueue replays persist exactly one durable job",async()=>{
 const work={kind:"INDEX",expertProfileId:expert,itemId:"missing",sourceVersion:1,namespace:ns,vectorIds:[]};
 const jobs=await Promise.all(Array.from({length:10},()=>enqueueLifecycleJob(work)));expect(new Set(jobs.map(j=>j.id)).size).toBe(1);expect(await prisma.knowledgeLifecycleJob.count()).toBe(1);
});
test("migration duplicate preflight fails without choosing/deleting legacy copies",async()=>{
 const sql=readFileSync("prisma/migrations/20260930170000_phase0_source_lifecycle/migration.sql","utf8").split("\n").filter(line=>!line.trim().startsWith("--")).join("\n");
 await expect(prisma.$transaction(async tx=>{
  await tx.$executeRawUnsafe('CREATE SCHEMA synthetic_duplicate_preflight');await tx.$executeRawUnsafe('SET LOCAL search_path TO synthetic_duplicate_preflight');
  await tx.$executeRawUnsafe('CREATE TABLE "KnowledgeItem" ("id" TEXT PRIMARY KEY,"expertProfileId" TEXT,"sourceType" TEXT,"sourceId" TEXT)');
  await tx.$executeRawUnsafe('CREATE TABLE "SubscriberMemory" ("id" TEXT PRIMARY KEY)');await tx.$executeRawUnsafe('CREATE TABLE "WidgetMessage" ("id" TEXT PRIMARY KEY)');
  await tx.$executeRawUnsafe('INSERT INTO "KnowledgeItem" VALUES ($1,$2,$3,$4),($5,$2,$3,$4)',"copy1",expert,"post","synthetic-post","copy2");
  for(const statement of sql.split(";").map(value=>value.trim()).filter(Boolean))await tx.$executeRawUnsafe(statement);
 })).rejects.toThrow("23505");
 const schema=await prisma.$queryRaw<{count:bigint}[]>`SELECT count(*) AS count FROM pg_namespace WHERE nspname='synthetic_duplicate_preflight'`;expect(schema[0].count).toBe(BigInt(0));
});

import { syntheticPaidPeriod } from "../../__tests__/helpers/paid-period";
