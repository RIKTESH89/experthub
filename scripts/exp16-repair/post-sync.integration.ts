import { readFileSync } from "fs";
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { syncPostSource, withPostOutbox, performIndexJob, removeKnowledgeItem } from '@/lib/knowledge/lifecycle';
import { decideCorrection } from '@/lib/corrections/service';
import { rebuildEvidenceSource } from '@/lib/graph/evidence-store';
import { enqueueLifecycleJob } from '@/lib/knowledge/outbox';
import { indexDocument, removeDocument } from '@/lib/vector/indexer';
// Real source transactions, enqueue SQL and evidence retirement; no provider/vector execution.
jest.mock('@/lib/vector/indexer',()=>({plannedVectorIds:()=>['synthetic-next'],indexDocument:jest.fn(async()=>['staged-vector']),removeDocument:jest.fn(async()=>{})}));
jest.mock('@/lib/knowledge/outbox',()=>({...jest.requireActual('@/lib/knowledge/outbox'),runLifecycleJob:jest.fn(async()=>false)}));
const decision={expertProfileId:'expert',actorId:'owner',reviewId:'review',expectedVersion:1,operationKey:'accept',action:'ACCEPT' as const,reason:'Synthetic reviewed correction'};
function gate(){let open!:()=>void;const promise=new Promise<void>(r=>{open=r;});return {promise,open};}
async function waitForLock(table:string){
 const deadline=Date.now()+4000;
 while(Date.now()<deadline){
  const rows=await prisma.$queryRaw<{waiting:boolean}[]>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE ${'%FROM "'+table+'"%FOR UPDATE%'}) AS waiting`;
  if(rows[0].waiting)return;
  await new Promise(r=>setTimeout(r,10));
 }
 throw Error('No observed native lock wait for '+table);
}
beforeAll(async()=>{
 expect(await prisma.$queryRaw`SELECT current_database() AS database,current_user AS username,inet_server_addr()::text AS address`).toEqual([{database:'exp16_repair_fixture',username:'exp16_fixture',address:null}]);
 // DMMF-derived scalar fixture tables only. No app migrations, extension installs or shared DB.
 // Relevant native unique/FK constraints are added explicitly below.
 const scalar:Record<string,string>={String:'TEXT',Int:'INTEGER',Float:'DOUBLE PRECISION',Boolean:'BOOLEAN',DateTime:'TIMESTAMP(3)',Json:'JSONB'};
 const quote=(v:string)=>'"'+v.replace(/"/g,'""')+'"';
 const literal=(v:unknown)=>typeof v==='string'?"'"+v.replace(/'/g,"''")+"'":String(v);
 for(const e of Prisma.dmmf.datamodel.enums)await prisma.$executeRawUnsafe(`CREATE TYPE ${quote(e.name)} AS ENUM (${e.values.map(v=>literal(v.name)).join(',')})`);
 for(const name of ['ExpertProfile','Post','KnowledgeItem','KnowledgeLifecycleJob']){
  const model=Prisma.dmmf.datamodel.models.find(m=>m.name===name)!;
  const columns=model.fields.filter(f=>f.kind!=='object').map(f=>{
   let type=scalar[f.type]||quote(f.type), def='';
   if(f.isList){type+='[]';def=" DEFAULT '{}'";}
   else if(typeof f.default==='object' && f.default!==null && 'name' in f.default && f.default.name==='now')def=' DEFAULT CURRENT_TIMESTAMP';
   else if(f.default!==undefined && typeof f.default!=='object')def=' DEFAULT '+literal(f.default);
   if(f.name==='updatedAt')def=' DEFAULT CURRENT_TIMESTAMP';
   return quote(f.name)+' '+type+(f.isRequired?' NOT NULL':'')+def+(f.isId?' PRIMARY KEY':'');
  });
  await prisma.$executeRawUnsafe(`CREATE TABLE ${quote(name)} (${columns.join(',')})`);
 }
 await prisma.$executeRawUnsafe('ALTER TABLE "ExpertProfile" ADD UNIQUE ("userId")');
 await prisma.$executeRawUnsafe('ALTER TABLE "KnowledgeItem" ADD UNIQUE ("expertProfileId","sourceType","sourceId"),ADD FOREIGN KEY ("expertProfileId") REFERENCES "ExpertProfile"("id")');
 // Copy only reviewed evidence/temporal fixture definitions, including their real FKs
 // and immutable triggers. No migration engine/ledger, application or vector migrations.
 for (const name of ['20261001090000_evidence_backed_kg','20261001100000_temporal_stances']) {
  const sql=readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8');
  const definitions=Array.from(sql.matchAll(/CREATE TABLE "[^"]+"[\s\S]*?;|CREATE FUNCTION [\s\S]*?\$\$;|CREATE TRIGGER [^;]+;/g)).map(match=>match[0]);
  for(const definition of definitions)await prisma.$executeRawUnsafe(definition);
 }
 await prisma.$executeRawUnsafe(`CREATE TABLE "CorrectionReview" ("id" TEXT PRIMARY KEY,"expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id"),"submittedBy" TEXT NOT NULL,"requestHash" TEXT NOT NULL,"proposal" JSONB NOT NULL,"state" TEXT NOT NULL DEFAULT 'PENDING',"version" INTEGER NOT NULL DEFAULT 1)`);
 await prisma.$executeRawUnsafe(`CREATE TABLE "CorrectionEvent" ("id" TEXT PRIMARY KEY,"reviewId" TEXT NOT NULL REFERENCES "CorrectionReview"("id"),"expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id"),"actorId" TEXT NOT NULL,"operationKey" TEXT NOT NULL,"requestHash" TEXT NOT NULL,"action" TEXT NOT NULL,"version" INTEGER NOT NULL,"detail" JSONB NOT NULL,UNIQUE("expertProfileId","operationKey"))`);
 await prisma.expertProfile.create({data:{id:'expert',userId:'owner',displayName:'Synthetic',specialty:[],vectorNamespace:'synthetic-ns'}});
});
beforeEach(async()=>{
 jest.mocked(indexDocument).mockClear();jest.mocked(removeDocument).mockClear();
 await prisma.$executeRawUnsafe('TRUNCATE "Post","KnowledgeItem","KnowledgeLifecycleJob","EvidenceDecisionCase","TemporalStance","EvidenceSupport","EvidenceSpan","EvidenceAssertion","EvidenceRevision","CorrectionEvent","CorrectionReview"');
 await prisma.post.create({data:{id:'post',authorId:'owner',title:'Advice',content:'Old statement',isRagEnabled:true,isPremiumOnly:true,isHidden:true,status:'DRAFT'}});
 await prisma.knowledgeItem.create({data:{id:'item',expertProfileId:'expert',sourceType:'post',sourceId:'post',title:'Advice',content:'Old statement',sourceVersion:1,indexedVersion:1,isIndexed:true,vectorIds:['old-vector'],metadata:{postId:'post',status:'DRAFT',isHidden:true,isPremiumOnly:true}}});
 await prisma.$executeRaw`INSERT INTO "EvidenceRevision" ("id","expertProfileId","itemId","sourceType","sourceVersion","contentHash","snapshotHash","content","publicationTimeBasis","sourceUpdatedAt","uploaderId","audience","extractorVersion") VALUES ('revision','expert','item','post',1,'synthetic-hash','synthetic-snapshot','Advice','unavailable',CURRENT_TIMESTAMP,'owner','private','synthetic-extractor')`;
 const proposal={feedback:'Expert checked',itemId:'item',sourceVersion:1,title:'Advice',content:'Accepted correction'};
 await prisma.$executeRaw`INSERT INTO "CorrectionReview" ("id","expertProfileId","submittedBy","requestHash","proposal") VALUES ('review','expert','owner','synthetic',${JSON.stringify(proposal)}::jsonb)`;
});
afterAll(async()=>{jest.restoreAllMocks();await prisma.$disconnect();});
async function assertAccepted(){
 expect(await prisma.post.findUnique({where:{id:'post'}})).toMatchObject({content:'Accepted correction',status:'DRAFT',isHidden:true,isPremiumOnly:true,isRagEnabled:true});
 expect(await prisma.knowledgeItem.findUnique({where:{id:'item'}})).toMatchObject({content:'Accepted correction',sourceVersion:2,isIndexed:false,metadata:{postId:'post',status:'DRAFT',isHidden:true,isPremiumOnly:true}});
 expect(await prisma.knowledgeLifecycleJob.count({where:{kind:'INDEX'}})).toBe(1);
 expect(await prisma.$queryRaw`SELECT "state","version" FROM "CorrectionReview"`).toEqual([{state:'ACCEPTED',version:2}]);
 expect(await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "CorrectionEvent"`).toEqual([{count:1}]);
 expect(await prisma.$queryRaw`SELECT "retiredAt" IS NOT NULL AS retired FROM "EvidenceRevision"`).toEqual([{retired:true}]);
}
test('native delayed discovery cannot republish the pre-acceptance post snapshot',async()=>{
 const paused=gate(),resume=gate();
 const original=prisma.expertProfile.findUnique.bind(prisma.expertProfile);
 const spy=jest.spyOn(prisma.expertProfile,'findUnique').mockImplementationOnce((async(args:Parameters<typeof original>[0])=>{const value=await original(args);paused.open();await resume.promise;return value;}) as unknown as typeof prisma.expertProfile.findUnique);
 const worker=syncPostSource('post');await paused.promise;
 try{expect(await decideCorrection(decision)).toMatchObject({state:'ACCEPTED'});}finally{resume.open();}
 await worker;spy.mockRestore();await assertAccepted();
});
test.each(['correction-first','sync-first'])('native opposite transaction interleavings complete without deadlock: %s',async mode=>{
 const locked=gate(),release=gate();
 const blocker=prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT "id" FROM "Post" WHERE "id"='post' FOR UPDATE`;locked.open();await release.promise;},{timeout:10000});
 await locked.promise;
 const first=mode==='correction-first'?decideCorrection(decision):syncPostSource('post');
 // Attach rejection handling before any waits so a regression cannot leave an unhandled rejection.
 const firstResult=first.then(value=>({value,error:null}),error=>({value:null,error}));
 let secondResult:Promise<any>;
 try{
  await waitForLock('Post');
  const second=mode==='correction-first'?syncPostSource('post'):decideCorrection(decision);
  secondResult=second.then(value=>({value,error:null}),error=>({value:null,error}));
  await waitForLock('ExpertProfile');
 }finally{release.open();await blocker;}
 expect((await firstResult).error).toBeNull();expect((await secondResult!).error).toBeNull();await assertAccepted();
});
test('native failed audit insertion rolls back authoritative post, projection, retirement and outbox',async()=>{
 await prisma.$executeRawUnsafe(`ALTER TABLE "CorrectionEvent" ADD CONSTRAINT synthetic_failure CHECK ("action"='REJECT')`);
 try{
  await expect(decideCorrection(decision)).rejects.toThrow();
  expect(await prisma.post.findUnique({where:{id:'post'}})).toMatchObject({content:'Old statement'});
  expect(await prisma.knowledgeItem.findUnique({where:{id:'item'}})).toMatchObject({content:'Old statement',sourceVersion:1,isIndexed:true});
  expect(await prisma.knowledgeLifecycleJob.count()).toBe(0);
  expect(await prisma.$queryRaw`SELECT "retiredAt" FROM "EvidenceRevision"`).toEqual([{retiredAt:null}]);
  expect(await prisma.$queryRaw`SELECT "state","version" FROM "CorrectionReview"`).toEqual([{state:'PENDING',version:1}]);
 }finally{await prisma.$executeRawUnsafe('ALTER TABLE "CorrectionEvent" DROP CONSTRAINT synthetic_failure');}
});
test('native post mutation acquires expert parent before post/outbox writes',async()=>{
 const locked=gate(),release=gate();
 const blocker=prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT "id" FROM "ExpertProfile" WHERE "id"='expert' FOR UPDATE`;locked.open();await release.promise;},{timeout:10000});
 await locked.promise;
 const write=withPostOutbox('owner',tx=>tx.post.update({where:{id:'post'},data:{isHidden:false}}));
 const outcome=write.then(value=>({value,error:null}),error=>({value:null,error}));
 try{await waitForLock('ExpertProfile');expect(await prisma.post.findUnique({where:{id:'post'}})).toMatchObject({isHidden:true});}finally{release.open();await blocker;}
 expect((await outcome).error).toBeNull();expect(await prisma.knowledgeLifecycleJob.count({where:{kind:'POST_SYNC'}})).toBe(1);
});

test('native RAG revocation retracts projection/evidence and preserves post visibility',async()=>{
 await withPostOutbox('owner',tx=>tx.post.update({where:{id:'post'},data:{isRagEnabled:false}}));
 await syncPostSource('post');
 expect(await prisma.knowledgeItem.count()).toBe(0);
 expect(await prisma.post.findUnique({where:{id:'post'}})).toMatchObject({status:'DRAFT',isHidden:true,isPremiumOnly:true,isRagEnabled:false});
 expect(await prisma.knowledgeLifecycleJob.count({where:{kind:'CLEANUP'}})).toBe(1);
 expect(await prisma.$queryRaw`SELECT "retiredAt" IS NOT NULL AS retired FROM "EvidenceRevision"`).toEqual([{retired:true}]);
});
test('native simultaneous first projection publication creates one source without duplicate versions',async()=>{
 await prisma.knowledgeItem.deleteMany();
 await Promise.all([syncPostSource('post'),syncPostSource('post')]);
 const sources=await prisma.knowledgeItem.findMany();
 expect(sources).toHaveLength(1);
 expect(sources[0]).toMatchObject({expertProfileId:'expert',sourceType:'post',sourceId:'post',content:'Old statement',sourceVersion:1,metadata:{postId:'post',status:'DRAFT',isHidden:true,isPremiumOnly:true}});
 expect(await prisma.knowledgeLifecycleJob.count({where:{kind:'INDEX'}})).toBe(1);
});

// Adversarial protocol coverage uses actual publication/rebuild/removal SQL, not
// a sentinel after the evidence INSERT. Both operations must finish successfully.
function pauseTransactionBefore(match:(sql:string)=>boolean) {
 const paused=gate(),resume=gate();
 const original=prisma.$transaction.bind(prisma);
 const spy=jest.spyOn(prisma,'$transaction').mockImplementationOnce(((fn:any)=>original(async(tx:any)=>{
  const wrapped=new Proxy(tx,{get(target,key){
   if(key==='$queryRaw')return async(parts:TemplateStringsArray,...values:any[])=>{
    const result=await target.$queryRaw(parts,...values);
    if(parts.join('').includes('FROM "ExpertProfile"') && parts.join('').includes('FOR UPDATE') && match('EXPERT_LOCKED')){paused.open();await resume.promise;}
    return result;
   };
   if(key==='$executeRaw')return async(parts:TemplateStringsArray,...values:any[])=>{
    if(match(parts.join(''))){paused.open();await resume.promise;}
    return target.$executeRaw(parts,...values);
   };
   if(key==='knowledgeLifecycleJob')return new Proxy(target.knowledgeLifecycleJob,{get(model,method){
    if(method==='upsert')return async(args:any)=>{
     if(args.create?.kind==='CLEANUP' && match('CLEANUP_UPSERT')){paused.open();await resume.promise;}
     return model.upsert(args);
    };
    const value=Reflect.get(model,method);return typeof value==='function'?value.bind(model):value;
   }});
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  return fn(wrapped);
 },{timeout:10000})) as typeof prisma.$transaction);
 return {paused,resume,spy};
}
async function waitForProtocolWait() {
 const deadline=Date.now()+4000;
 while(Date.now()<deadline){
  const rows=await prisma.$queryRaw<{waiting:boolean}[]>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND (query LIKE '%FROM "ExpertProfile"%FOR UPDATE%' OR query LIKE '%FROM "KnowledgeItem"%FOR UPDATE%' OR query LIKE '%UPDATE%"KnowledgeItem"%')) AS waiting`;
  if(rows[0].waiting)return;
  await new Promise(r=>setTimeout(r,10));
 }
 throw Error('No observed native protocol wait');
}
async function interleave(first:()=>Promise<unknown>,second:()=>Promise<unknown>,match:(sql:string)=>boolean) {
 const barrier=pauseTransactionBefore(match);
 const a=first().then(value=>({value,error:null}),error=>({value:null,error}));
 await barrier.paused.promise;
 const b=second().then(value=>({value,error:null}),error=>({value:null,error}));
 let waitError:unknown=null;
 try{await waitForProtocolWait();}catch(error){waitError=error;}finally{barrier.resume.open();}
 try{
  const outcomes=await Promise.all([a,b]);
  expect(outcomes.map(o=>o.error)).toEqual([null,null]);
  if(waitError)throw waitError;
  return outcomes;
 }finally{barrier.spy.mockRestore();}
}
const cleanupPause=(sql:string)=>sql==='CLEANUP_UPSERT';
const evidencePause=(sql:string)=>sql.startsWith('INSERT INTO "EvidenceRevision"');
async function stagedIndexJob(){
 await prisma.knowledgeItem.update({where:{id:'item'},data:{isIndexed:false,indexedVersion:null}});
 return {id:'synthetic-index',kind:'INDEX',expertProfileId:'expert',itemId:'item',sourceVersion:1,namespace:'synthetic-ns',vectorIds:['staged-vector']} as any;
}
async function matchingCleanup(){
 return enqueueLifecycleJob({kind:'CLEANUP',expertProfileId:'expert',itemId:'item',sourceVersion:1,namespace:'synthetic-ns',vectorIds:['old-vector']});
}
async function assertRetractedAndDrain(){
 expect(await prisma.knowledgeItem.count()).toBe(0);
 expect(await prisma.$queryRaw`SELECT COUNT(*)::int AS active FROM "EvidenceRevision" WHERE "retiredAt" IS NULL`).toEqual([{active:0}]);
 const jobs=await prisma.knowledgeLifecycleJob.findMany({where:{kind:'CLEANUP'}});
 expect(jobs.map(job=>job.vectorIds).sort()).toEqual([['old-vector'],['staged-vector']]);
 const run=jest.requireActual('@/lib/knowledge/outbox').runLifecycleJob;
 for(const job of jobs)await run(job.id,'expert',()=>{throw Error('Unexpected provider index');});
 expect(await prisma.knowledgeLifecycleJob.count({where:{kind:'CLEANUP',state:'DONE'}})).toBe(2);
 expect(jest.mocked(removeDocument).mock.calls.map(call=>call[1]).sort()).toEqual([['old-vector'],['staged-vector']]);
}
test.each(['rebuild-first','sync-first'])('native real evidence FK/projection completes in both rebuild/sync orders: %s',async mode=>{
 // Exercise actual assertion and temporal publication, including parent FKs/triggers.
 await prisma.post.update({where:{id:'post'},data:{content:'I prefer careful experiments.'}});
 await prisma.knowledgeItem.update({where:{id:'item'},data:{content:'I prefer careful experiments.'}});
 if(mode==='rebuild-first')await interleave(()=>rebuildEvidenceSource('expert','item'),()=>syncPostSource('post'),evidencePause);
 else await interleave(()=>syncPostSource('post'),()=>rebuildEvidenceSource('expert','item'),sql=>sql==='EXPERT_LOCKED');
 expect(await prisma.$queryRaw`SELECT COUNT(*)::int AS active FROM "EvidenceRevision" WHERE "retiredAt" IS NULL`).toEqual([{active:1}]);
 expect(await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "EvidenceAssertion"`).toEqual([{count:1}]);
 expect(await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "TemporalStance"`).toEqual([{count:1}]);
});
test.each(['index-first','remove-first'])('native index/removal with the same deterministic cleanup job has no cycle: %s',async mode=>{
 const job=await stagedIndexJob();await matchingCleanup();
 if(mode==='index-first')await interleave(()=>performIndexJob(job),()=>removeKnowledgeItem('expert','item'),cleanupPause);
 else await interleave(()=>removeKnowledgeItem('expert','item'),()=>performIndexJob(job),cleanupPause);
 await assertRetractedAndDrain();
});
test.each(['index-first','retraction-first'])('native index/RAG retraction preserves revocation and cleanup in both orders: %s',async mode=>{
 const job=await stagedIndexJob();await matchingCleanup();
 if(mode==='index-first')await interleave(()=>performIndexJob(job),async()=>{await withPostOutbox('owner',tx=>tx.post.update({where:{id:'post'},data:{isRagEnabled:false}}));await syncPostSource('post');},cleanupPause);
 else {
  await withPostOutbox('owner',tx=>tx.post.update({where:{id:'post'},data:{isRagEnabled:false}}));
  await interleave(()=>syncPostSource('post'),()=>performIndexJob(job),cleanupPause);
 }
 await assertRetractedAndDrain();
 expect(await prisma.post.findUnique({where:{id:'post'}})).toMatchObject({status:'DRAFT',isPremiumOnly:true,isHidden:true,isRagEnabled:false});
});
test('native evidence publication failure rolls back source/revision and durably cleans staged vectors',async()=>{
 const job=await stagedIndexJob();
 await prisma.$executeRawUnsafe(`ALTER TABLE "EvidenceRevision" ADD CONSTRAINT synthetic_publication_failure CHECK ("id"='revision')`);
 try{
  await expect(performIndexJob(job)).rejects.toThrow('synthetic_publication_failure');
  expect(await prisma.knowledgeItem.findUnique({where:{id:'item'}})).toMatchObject({sourceVersion:1,indexedVersion:null,isIndexed:false,vectorIds:['old-vector'],indexingError:expect.any(String)});
  expect(await prisma.$queryRaw`SELECT "id","retiredAt" FROM "EvidenceRevision"`).toEqual([{id:'revision',retiredAt:null}]);
  const jobs=await prisma.knowledgeLifecycleJob.findMany({where:{kind:'CLEANUP'}});
  expect(jobs).toHaveLength(1);expect(jobs[0].vectorIds).toEqual(['staged-vector']);
  await jest.requireActual('@/lib/knowledge/outbox').runLifecycleJob(jobs[0].id,'expert',()=>{throw Error('Unexpected index');});
  expect(jest.mocked(removeDocument)).toHaveBeenCalledWith('synthetic-ns',['staged-vector']);
  expect(await prisma.knowledgeLifecycleJob.findUnique({where:{id:jobs[0].id}})).toMatchObject({state:'DONE'});
 }finally{await prisma.$executeRawUnsafe('ALTER TABLE "EvidenceRevision" DROP CONSTRAINT synthetic_publication_failure');}
});
test('native index finishing after accepted correction cannot publish stale evidence or retire new state',async()=>{
 const job=await stagedIndexJob();const paused=gate(),resume=gate();
 jest.mocked(indexDocument).mockImplementationOnce(async()=>{paused.open();await resume.promise;return ['staged-vector'];});
 const worker=performIndexJob(job);await paused.promise;
 try{await decideCorrection(decision);}finally{resume.open();}
 await worker;
 await assertAccepted();
 expect(await prisma.$queryRaw`SELECT COUNT(*)::int AS active FROM "EvidenceRevision" WHERE "retiredAt" IS NULL`).toEqual([{active:0}]);
 expect(await prisma.knowledgeLifecycleJob.count({where:{kind:'CLEANUP',vectorIds:{equals:['staged-vector']}}})).toBe(1);
});

test('native removal cleanup failure rolls back revocation, then retry captures and drains final IDs',async()=>{
 await prisma.$executeRawUnsafe(`ALTER TABLE "KnowledgeLifecycleJob" ADD CONSTRAINT synthetic_cleanup_failure CHECK ("kind"<>'CLEANUP')`);
 try{
  await expect(removeKnowledgeItem('expert','item')).rejects.toThrow('synthetic_cleanup_failure');
  expect(await prisma.knowledgeItem.findUnique({where:{id:'item'}})).toMatchObject({sourceVersion:1,isIndexed:true,vectorIds:['old-vector']});
  expect(await prisma.$queryRaw`SELECT "retiredAt" FROM "EvidenceRevision"`).toEqual([{retiredAt:null}]);
  expect(await prisma.knowledgeLifecycleJob.count()).toBe(0);
 }finally{await prisma.$executeRawUnsafe('ALTER TABLE "KnowledgeLifecycleJob" DROP CONSTRAINT synthetic_cleanup_failure');}
 await removeKnowledgeItem('expert','item');
 expect(await prisma.knowledgeItem.count()).toBe(0);
 expect(await prisma.$queryRaw`SELECT "retiredAt" IS NOT NULL AS retired FROM "EvidenceRevision"`).toEqual([{retired:true}]);
 const job=await prisma.knowledgeLifecycleJob.findFirstOrThrow({where:{kind:'CLEANUP'}});
 expect(job.vectorIds).toEqual(['old-vector']);
 await jest.requireActual('@/lib/knowledge/outbox').runLifecycleJob(job.id,'expert',()=>{throw Error('Unexpected index');});
 expect(await prisma.knowledgeLifecycleJob.findUnique({where:{id:job.id}})).toMatchObject({state:'DONE'});
 expect(jest.mocked(removeDocument)).toHaveBeenCalledWith('synthetic-ns',['old-vector']);
});
