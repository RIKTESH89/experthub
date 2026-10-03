import prisma from '@/lib/prisma';
import { syncKnowledgeItem, performIndexJob, drainLifecycleJobs } from '@/lib/knowledge/lifecycle';
import { enqueueLifecycleJob, runLifecycleJob } from '@/lib/knowledge/outbox';
import { plannedVectorIds } from '@/lib/vector/indexer';
import { resolveRetrievalScope } from '@/lib/knowledge/access';
import { spawn } from 'child_process';
import { join } from 'path';
import { writeFileSync } from 'fs';
let failEmbedding=false,embeddingCalls=0;
jest.mock('@/lib/vector/embeddings',()=>{
 const actual=jest.requireActual('@/lib/vector/embeddings');
 return {...actual,generateEmbedding:async()=>{embeddingCalls++;if(failEmbedding)throw Error('Synthetic embedding outage');const values=Array(actual.EMBEDDING_DIMENSIONS).fill(0);values[0]=1;return values;}};
});
global.fetch=async()=>{throw Error('External network prohibited');};
const expert='exp28-native-expert',owner='exp28-native-owner';
const observations:any[]=[];
async function source(id:string,content=`I prefer tea. Synthetic ${id}.`){return prisma.knowledgeItem.create({data:{id,expertProfileId:expert,title:'Native ingestion',content,sourceType:'manual',metadata:{authorId:owner,audience:'public'}}});}
function work(item:any){return {kind:'INDEX',expertProfileId:expert,itemId:item.id,sourceVersion:item.sourceVersion,namespace:'exp28-native',vectorIds:plannedVectorIds(expert,item.id,item.sourceVersion,`${item.title}\n\n${item.content}`)};}
async function crashAtVector(id:string,mode='crash-after-vector'){
 return new Promise<any>((resolve,reject)=>{
  const child=spawn(process.execPath,[join(__dirname,'native-worker.cjs'),mode,id],{env:process.env,stdio:['ignore','pipe','pipe','ipc']});
  let checkpoint:any;let diagnostics='';let settled=false;
  const timer=setTimeout(()=>{child.kill('SIGKILL');if(!settled){settled=true;reject(Error('Owned worker checkpoint timeout: '+diagnostics));}},10000);
  child.stdout.on('data',d=>diagnostics+=d);child.stderr.on('data',d=>diagnostics+=d);
  child.on('message',(message:any)=>{if(['vector-committed-before-publication','publication-committed-before-ack'].includes(message.checkpoint)){checkpoint=message;child.kill('SIGKILL');}});
  child.on('error',e=>{clearTimeout(timer);if(!settled){settled=true;reject(e);}});
  child.on('exit',(code,signal)=>{clearTimeout(timer);if(!settled){settled=true;if(checkpoint&&signal==='SIGKILL')resolve({...checkpoint,signal});else reject(Error(`Worker exited before checkpoint (${code}/${signal}): ${diagnostics}`));}});
 });
}
async function assertPublished(id:string){
 const item=await prisma.knowledgeItem.findUniqueOrThrow({where:{id}});expect(item.isIndexed).toBe(true);expect(item.indexedVersion).toBe(item.sourceVersion);
 expect(item.vectorIds).toEqual(plannedVectorIds(expert,id,item.sourceVersion,`${item.title}\n\n${item.content}`));
 const vectors=await prisma.vectorChunk.findMany({where:{vectorId:{in:item.vectorIds}}});expect(vectors).toHaveLength(item.vectorIds.length);expect(vectors.every(v=>v.namespace==='exp28-native')).toBe(true);
 const revisions=await prisma.$queryRaw<any[]>`SELECT * FROM "EvidenceRevision" WHERE "expertProfileId"=${expert} AND "itemId"=${id} AND "retiredAt" IS NULL`;
 expect(revisions).toHaveLength(1);expect(revisions[0].sourceVersion).toBe(item.sourceVersion);expect(revisions[0].content).toBe(`${item.title}\n\n${item.content}`);
 return item;
}
beforeAll(async()=>{await prisma.user.create({data:{id:owner,email:'exp28-native@example.test',role:'EXPERT'}});await prisma.expertProfile.create({data:{id:expert,userId:owner,displayName:'Native synthetic',specialty:[],vectorNamespace:'exp28-native'}});});
afterAll(async()=>{writeFileSync('audit/exp28-29/ingestion.json',JSON.stringify({observations,embeddingAdapter:'Synthetic 1536-dimensional nonzero values; real validation, chunking, pgvector, publication/evidence, lifecycle and outbox',embeddingCalls,concurrentApplicationOperations:10,userCapacityProved:false,externalSpendINR:0,suiteResultSource:'jest.json; observations alone do not establish suite success'},null,2));await prisma.$disconnect();});
test('real syncKnowledgeItem: ten concurrent source ingestions and twenty idempotent replays',async()=>{
 const ids=Array.from({length:10},(_,i)=>'exp28-native-load-'+i);for(const id of ids)await source(id);
 const start=performance.now();await Promise.all(ids.map(id=>syncKnowledgeItem(expert,id)));const durationMs=performance.now()-start;
 for(const id of ids)await assertPublished(id);
 const before={vectors:await prisma.vectorChunk.count({where:{namespace:'exp28-native'}}),revisions:await prisma.$queryRaw`SELECT count(*)::integer AS count FROM "EvidenceRevision" WHERE "expertProfileId"=${expert}`};
 const calls=embeddingCalls;await Promise.all(Array.from({length:20},(_,i)=>syncKnowledgeItem(expert,ids[i%10])));
 expect(embeddingCalls).toBe(calls);expect(await prisma.vectorChunk.count({where:{namespace:'exp28-native'}})).toBe(before.vectors);
 expect(await prisma.$queryRaw`SELECT count(*)::integer AS count FROM "EvidenceRevision" WHERE "expertProfileId"=${expert}`).toEqual(before.revisions);
 observations.push({scenario:'10 concurrent actual ingestion calls',durationMs,completed:10,idempotentReplays:20});
});
test('real ingestion failure persists retry intent; backoff then recovery publishes exactly once',async()=>{
 const item=await source('exp28-native-failure');failEmbedding=true;
 try{await expect(syncKnowledgeItem(expert,item.id)).rejects.toThrow('Synthetic embedding outage');}finally{failEmbedding=false;}
 const failed=await prisma.knowledgeItem.findUniqueOrThrow({where:{id:item.id}});expect(failed.isIndexed).toBe(false);expect(failed.indexingError).toBe('Synthetic embedding outage');
 const job=await prisma.knowledgeLifecycleJob.findFirstOrThrow({where:{itemId:item.id,kind:'INDEX'}});expect(job.state).toBe('PENDING');expect(job.attempts).toBe(1);
 expect(await runLifecycleJob(job.id,expert,performIndexJob,new Date(job.availableAt.getTime()-1))).toBe(false);
 expect(await runLifecycleJob(job.id,expert,performIndexJob,job.availableAt)).toBe(true);await assertPublished(item.id);
 const complete=await prisma.knowledgeLifecycleJob.findUniqueOrThrow({where:{id:job.id}});expect(complete.attempts).toBe(2);expect(complete.state).toBe('DONE');
 observations.push({scenario:'real embedding failure/retry',attempts:2,state:'DONE'});
});
test('ten competing real ingestion calls for one source publish one revision',async()=>{
 const item=await source('exp28-native-contended');const calls=embeddingCalls;const start=performance.now();
 await Promise.all(Array.from({length:10},()=>syncKnowledgeItem(expert,item.id)));
 await assertPublished(item.id);expect(embeddingCalls-calls).toBe(1);
 const jobs=await prisma.knowledgeLifecycleJob.findMany({where:{itemId:item.id,kind:'INDEX'}});expect(jobs).toHaveLength(1);expect(jobs[0].attempts).toBe(1);expect(jobs[0].state).toBe('DONE');
 observations.push({scenario:'10 competing actual sync calls for one source',durationMs:performance.now()-start,embeddingCalls:1,indexAttempts:1});
});
test('actual worker SIGKILL after vector commit: durable RUNNING lease and publication recover without duplicate vectors',async()=>{
 const item=await source('exp28-native-crash');const checkpoint=await crashAtVector(item.id);
 const interrupted=await prisma.knowledgeLifecycleJob.findFirstOrThrow({where:{itemId:item.id,kind:'INDEX'}});expect(interrupted.state).toBe('RUNNING');expect(interrupted.attempts).toBe(1);
 expect(await prisma.vectorChunk.count({where:{vectorId:{in:work(item).vectorIds}}})).toBe(1);
 expect((await prisma.knowledgeItem.findUniqueOrThrow({where:{id:item.id}})).isIndexed).toBe(false);
 expect((await resolveRetrievalScope(expert,'exp28-native',owner,'synthetic-visitor')).allowedVectorIds).not.toContain(work(item).vectorIds[0]);
 expect(await runLifecycleJob(interrupted.id,expert,performIndexJob,new Date(interrupted.leaseUntil!.getTime()-1))).toBe(false);
 expect(await runLifecycleJob(interrupted.id,expert,performIndexJob,new Date(interrupted.leaseUntil!.getTime()+1))).toBe(true);
 await assertPublished(item.id);expect((await prisma.knowledgeLifecycleJob.findUniqueOrThrow({where:{id:interrupted.id}})).attempts).toBe(2);
 observations.push({scenario:'actual process interruption before publication',...checkpoint,recovered:'current manifest/evidence and one deterministic vector; attempt 2',leaseExpiry:'controlled clock; no five-minute wait'});
});
test('real drain reconciles source-create-before-enqueue interruption window',async()=>{
 const item=await source('exp28-native-no-enqueue');expect(await prisma.knowledgeLifecycleJob.count({where:{itemId:item.id}})).toBe(0);
 await drainLifecycleJobs(expert,20,new Date(Date.now()+400000));await assertPublished(item.id);
 observations.push({scenario:'durable source with missing job reconciled by real drainLifecycleJobs',itemId:item.id});
});
test('actual process interruption after atomic publication, before DONE ack replays without extra embeddings or evidence',async()=>{
 const item=await source('exp28-native-published-crash');const checkpoint=await crashAtVector(item.id,'crash-after-publication');
 const published=await assertPublished(item.id);const job=await prisma.knowledgeLifecycleJob.findFirstOrThrow({where:{itemId:item.id,kind:'INDEX'}});
 expect(job.state).toBe('RUNNING');expect(job.attempts).toBe(1);
 const vectors=await prisma.vectorChunk.findMany({where:{vectorId:{in:published.vectorIds}},orderBy:{id:'asc'}});
 const before=await prisma.$queryRaw`SELECT * FROM "EvidenceRevision" WHERE "itemId"=${item.id} ORDER BY "id"`;
 const calls=embeddingCalls;expect(await runLifecycleJob(job.id,expert,performIndexJob,new Date(job.leaseUntil!.getTime()+1))).toBe(true);
 expect(embeddingCalls).toBe(calls);expect(await prisma.vectorChunk.findMany({where:{vectorId:{in:published.vectorIds}},orderBy:{id:'asc'}})).toEqual(vectors);
 expect(await prisma.$queryRaw`SELECT * FROM "EvidenceRevision" WHERE "itemId"=${item.id} ORDER BY "id"`).toEqual(before);
 expect((await prisma.knowledgeLifecycleJob.findUniqueOrThrow({where:{id:job.id}})).state).toBe('DONE');
 observations.push({scenario:'actual process interruption after publication before ack',...checkpoint,replay:'no embedding call, unchanged vectors/evidence, DONE'});
});
test('new source revision after interrupted vector write fences old job and cleans orphan vectors',async()=>{
 const item=await source('exp28-native-stale');await crashAtVector(item.id);
 const job=await prisma.knowledgeLifecycleJob.findFirstOrThrow({where:{itemId:item.id,kind:'INDEX'}});
 await prisma.knowledgeItem.update({where:{id:item.id},data:{sourceVersion:{increment:1},content:'I prefer coffee. New authoritative source revision.',isIndexed:false}});
 const now=new Date(job.leaseUntil!.getTime()+1);expect(await runLifecycleJob(job.id,expert,performIndexJob,now)).toBe(true);
 expect((await prisma.knowledgeItem.findUniqueOrThrow({where:{id:item.id}})).isIndexed).toBe(false);
 for(let i=0;i<3;i++)await drainLifecycleJobs(expert,20,now);
 const current=await assertPublished(item.id);expect(current.sourceVersion).toBe(2);
 expect(await prisma.vectorChunk.count({where:{vectorId:{in:work(item).vectorIds}}})).toBe(0);
 expect((await resolveRetrievalScope(expert,'exp28-native',owner,'synthetic-visitor')).allowedVectorIds).not.toContain(work(item).vectorIds[0]);
 observations.push({scenario:'source revision changes after worker crash',sourceVersion:2,oldVectorRowsRemaining:0,currentEvidenceRevisions:1});
});
test('prepare explicit backup boundary: committed source, PENDING intent, and crashed RUNNING intent',async()=>{
 for(let i=0;i<3;i++)await drainLifecycleJobs(expert,20,new Date(Date.now()+400000));
 const pending=await source('exp28-backup-pending','I prefer tea. Backup boundary exp28-backup-pending.');await enqueueLifecycleJob(work(pending));
 const inflight=await source('exp28-backup-inflight','I prefer tea. Backup boundary exp28-backup-inflight.');await crashAtVector(inflight.id);
 const states=await prisma.knowledgeLifecycleJob.findMany({where:{itemId:{in:[pending.id,inflight.id]},kind:'INDEX'},orderBy:{itemId:'asc'}});
 expect(states).toHaveLength(2);expect(states.find(j=>j.itemId===pending.id)?.state).toBe('PENDING');expect(states.find(j=>j.itemId===inflight.id)?.state).toBe('RUNNING');
 observations.push({scenario:'backup boundary prepared before pg_dump',pendingSource:pending.id,runningSource:inflight.id,postBackupWrite:'Runner creates after-backup only after pg_dump completes; absent before restore replay'});
});
