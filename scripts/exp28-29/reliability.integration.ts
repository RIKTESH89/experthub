import prisma from '@/lib/prisma';
import { enqueueLifecycleJob, runLifecycleJob } from '@/lib/knowledge/outbox';
import { removeKnowledgeItem } from '@/lib/knowledge/lifecycle';
import { publishEvidence } from '@/lib/graph/evidence-store';
import { releasePersona } from '@/lib/persona/store';
import { resolveRetrievalScope } from '@/lib/knowledge/access';
import { rateLimit } from '@/lib/rate-limit';
import { createLocalScheduler } from '@/lib/knowledge/local-scheduler';
import { writeFileSync } from 'fs';
const removed=jest.fn();
jest.mock('@/lib/vector/indexer',()=>({removeDocument:(...a:unknown[])=>removed(...a),plannedVectorIds:()=>[],indexDocument:()=>{throw Error('Provider prohibited');}}));
global.fetch=async()=>{throw Error('External network prohibited');};
const owner='exp28-owner', expert='exp28-expert';
const measurements:any[]=[];
const work=(id:string)=>({kind:'INDEX',expertProfileId:expert,itemId:id,sourceVersion:1,namespace:'exp28-synthetic',vectorIds:[]});
beforeAll(async()=>{
 await prisma.user.create({data:{id:owner,email:'exp28@example.test',role:'EXPERT'}});
 await prisma.expertProfile.create({data:{id:expert,userId:owner,displayName:'Synthetic',specialty:[],vectorNamespace:'exp28-synthetic'}});
});
afterAll(async()=>{writeFileSync('audit/exp28-29/load.json',JSON.stringify({concurrentWorkers:10,userCapacityProved:false,externalSpendINR:0,measurements,limitations:'SQL lifecycle only; no HTTP/chat/provider load; worker crash simulated by abandoned persisted lease.'},null,2));await prisma.$disconnect();});
test('10 concurrent claims have exactly one side effect; retries are idempotent',async()=>{
 const job=await enqueueLifecycleJob(work('concurrent'));let calls=0;const start=performance.now();
 const results=await Promise.all(Array.from({length:10},()=>runLifecycleJob(job.id,expert,async()=>{calls++;})));
 expect(results.filter(Boolean)).toHaveLength(1);expect(calls).toBe(1);
 expect(await runLifecycleJob(job.id,expert,async()=>{calls++;})).toBe(false);
 measurements.push({scenario:'10 concurrent claims',durationMs:performance.now()-start,winners:1});
});
test('bounded 10-worker batch completes 100 synthetic jobs',async()=>{
 const jobs: Awaited<ReturnType<typeof enqueueLifecycleJob>>[]=[];for(let i=0;i<100;i++)jobs.push(await enqueueLifecycleJob(work('load-'+i)));
 let next=0,calls=0;const durations:number[]=[];const start=performance.now();
 await Promise.all(Array.from({length:10},async()=>{while(next<jobs.length){const job=jobs[next++];const t=performance.now();expect(await runLifecycleJob(job.id,expert,async()=>{calls++;})).toBe(true);durations.push(performance.now()-t);}}));
 expect(calls).toBe(100);expect(await prisma.knowledgeLifecycleJob.count({where:{id:{in:jobs.map(j=>j.id)},state:'DONE'}})).toBe(100);
 durations.sort((a,b)=>a-b);measurements.push({scenario:'100 jobs / 10 workers',durationMs:performance.now()-start,p50Ms:durations[49],p95Ms:durations[94],completed:calls});
});
test('failure respects backoff; wrong tenant cannot claim; expired interrupted lease recovers',async()=>{
 const job=await enqueueLifecycleJob(work('retry'));const now=new Date(Date.now()+1000);
 await expect(runLifecycleJob(job.id,expert,async()=>{throw Error('Synthetic failure');},now)).rejects.toThrow('Synthetic failure');
 const failed=await prisma.knowledgeLifecycleJob.findUniqueOrThrow({where:{id:job.id}});
 expect(failed.state).toBe('PENDING');expect(failed.availableAt.getTime()-now.getTime()).toBe(2000);
 expect(await runLifecycleJob(job.id,expert,async()=>{},now)).toBe(false);
 expect(await runLifecycleJob(job.id,'foreign',async()=>{},failed.availableAt)).toBe(false);
 await prisma.knowledgeLifecycleJob.update({where:{id:job.id},data:{state:'RUNNING',leaseToken:'abandoned-worker',leaseUntil:now}});
 expect(await runLifecycleJob(job.id,expert,async()=>{},failed.availableAt)).toBe(true);
 expect((await prisma.knowledgeLifecycleJob.findUniqueOrThrow({where:{id:job.id}})).attempts).toBe(2);
});
test('stale worker cannot acknowledge a replacement lease',async()=>{
 const job=await enqueueLifecycleJob(work('stale'));let release!:()=>void;let entered!:()=>void;
 const started=new Promise<void>(r=>entered=r), gate=new Promise<void>(r=>release=r);const now=new Date(Date.now()+1000);
 const old=runLifecycleJob(job.id,expert,async()=>{entered();await gate;},now);await started;
 const replacement=runLifecycleJob(job.id,expert,async()=>{throw Error('Replacement failure');},new Date(now.getTime()+300001));
 await expect(replacement).rejects.toThrow('Replacement failure');release();await old;
 const row=await prisma.knowledgeLifecycleJob.findUniqueOrThrow({where:{id:job.id}});
 expect(row.state).toBe('PENDING');expect(row.lastError).toBe('Replacement failure');expect(row.attempts).toBe(2);
});
test('cleanup protects current vector IDs; deletion revokes before failed cleanup',async()=>{
 await prisma.knowledgeItem.create({data:{id:'cleanup',expertProfileId:expert,title:'Synthetic',content:'Synthetic',sourceType:'manual',vectorIds:['live'],isIndexed:true,indexedVersion:1}});
 const job=await enqueueLifecycleJob({...work('cleanup'),kind:'CLEANUP',vectorIds:['live','orphan']});
 await runLifecycleJob(job.id,expert,async()=>{});expect(removed).toHaveBeenLastCalledWith('exp28-synthetic',['orphan']);
 await removeKnowledgeItem(expert,'cleanup');expect(await prisma.knowledgeItem.findUnique({where:{id:'cleanup'}})).toBeNull();
 removed.mockRejectedValueOnce(Error('Cleanup unavailable'));
 const pending=await prisma.knowledgeLifecycleJob.findFirstOrThrow({where:{itemId:'cleanup',state:'PENDING'}});
 await expect(runLifecycleJob(pending.id,expert,async()=>{},new Date(Date.now()+1000))).rejects.toThrow('Cleanup unavailable');
 expect(await prisma.knowledgeItem.findUnique({where:{id:'cleanup'}})).toBeNull();
});
test('persona rollback appends audited release and preserves source data',async()=>{
 const source=await prisma.knowledgeItem.create({data:{id:'rollback-source',expertProfileId:expert,title:'Advice',content:'I prefer tea.',sourceType:'manual',isIndexed:true,indexedVersion:1,vectorIds:['synthetic-vector']}});
 await prisma.$transaction(tx=>publishEvidence(tx,source,owner));
 const a=await releasePersona({expertProfileId:expert,actorId:owner,operationKey:'a',expectedHead:null});
 const b=await releasePersona({expertProfileId:expert,actorId:owner,operationKey:'b',expectedHead:a.id});
 const rollback=await releasePersona({expertProfileId:expert,actorId:owner,operationKey:'rollback',expectedHead:b.id,rollbackTo:a.id});
 expect(rollback.manifest.rollbackOf).toBe(a.id);expect(rollback.manifest.parentReleaseId).toBe(b.id);
 expect((await prisma.knowledgeItem.findUniqueOrThrow({where:{id:source.id}})).content).toBe('I prefer tea.');
});
test('live retrieval guard excludes stale revisions and undeclared audience',async()=>{
 await prisma.knowledgeItem.create({data:{id:'stale-source',expertProfileId:expert,title:'Synthetic',content:'Synthetic',sourceType:'manual',sourceVersion:2,indexedVersion:1,isIndexed:true,vectorIds:['stale-vector'],metadata:{audience:'public'}}});
 const visitor=await resolveRetrievalScope(expert,'exp28-synthetic',owner,'synthetic-visitor');
 expect(visitor.allowedVectorIds).toEqual([]);
 const own=await resolveRetrievalScope(expert,'exp28-synthetic',owner,owner);
 expect(own.allowedVectorIds).not.toContain('stale-vector');expect(own.allowedVectorIds).toContain('synthetic-vector');
});
test('local guard admits only bounded work and rate limit rejects request eleven',()=>{
 const results=Array.from({length:11},()=>rateLimit('exp28-unique-local-client',10));
 expect(results.filter(r=>r.allowed)).toHaveLength(10);expect(results[10].allowed).toBe(false);
 const clock={now:()=>new Date(),setTimeout:()=>0,clearTimeout:()=>{}};
 expect(()=>createLocalScheduler({syntheticExpertIds:['real-expert'],drain:async()=>{},clock})).toThrow('Explicit synthetic');
 expect(()=>createLocalScheduler({syntheticExpertIds:['synthetic-exp28'],drain:async()=>{},clock,batchSize:21})).toThrow('Invalid local');
});
