import { readFileSync } from "fs";
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { syncPostSource, withPostOutbox, performIndexJob, removeKnowledgeItem } from '@/lib/knowledge/lifecycle';
import { submitCorrection, decideCorrection } from '@/lib/corrections/service';
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
 expect(await prisma.$queryRaw`SELECT current_database() AS database,current_user AS username,inet_server_addr()::text AS address`).toEqual([{database:'exp16_replay_fixture',username:'exp16_fixture',address:null}]);
 // DMMF-derived scalar fixture tables only. No app migrations, extension installs or shared DB.
 // Relevant native unique/FK constraints are added explicitly below.
 const scalar:Record<string,string>={String:'TEXT',Int:'INTEGER',Float:'DOUBLE PRECISION',Boolean:'BOOLEAN',DateTime:'TIMESTAMP(3)',Json:'JSONB'};
 const quote=(v:string)=>'"'+v.replace(/"/g,'""')+'"';
 const literal=(v:unknown)=>typeof v==='string'?"'"+v.replace(/'/g,"''")+"'":String(v);
 for(const e of Prisma.dmmf.datamodel.enums)await prisma.$executeRawUnsafe(`CREATE TYPE ${quote(e.name)} AS ENUM (${e.values.map(v=>literal(v.name)).join(',')})`);
 for(const name of ['ExpertProfile','WidgetConfig','Post','KnowledgeItem','KnowledgeLifecycleJob']){
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
 const releaseSql=readFileSync('prisma/migrations/20261003110000_reviewed_persona_releases/migration.sql','utf8');
 for(const definition of Array.from(releaseSql.matchAll(/CREATE TABLE "[^"]+"[\s\S]*?;|CREATE FUNCTION [\s\S]*?\$\$;|CREATE TRIGGER [^;]+;/g)).map(match=>match[0]))await prisma.$executeRawUnsafe(definition);
 await prisma.$executeRawUnsafe('ALTER TABLE "WidgetConfig" ADD UNIQUE ("expertProfileId")');
 await prisma.expertProfile.create({data:{id:'expert',userId:'owner',displayName:'Synthetic',specialty:[],vectorNamespace:'synthetic-ns'}});
});
beforeEach(async()=>{
 delete process.env.OPENAI_MODEL;
 await prisma.expertProfile.update({where:{id:'expert'},data:{ragEnabled:true,twinGreeting:null}});
 jest.mocked(indexDocument).mockClear();jest.mocked(removeDocument).mockClear();
 await prisma.$executeRawUnsafe('TRUNCATE "PersonaReleaseHead","PersonaRelease","WidgetConfig","Post","KnowledgeItem","KnowledgeLifecycleJob","EvidenceDecisionCase","TemporalStance","EvidenceSupport","EvidenceSpan","EvidenceAssertion","EvidenceRevision","CorrectionEvent","CorrectionReview"');
 await prisma.post.create({data:{id:'post',authorId:'owner',title:'Advice',content:'Old statement',isRagEnabled:true,isPremiumOnly:true,isHidden:true,status:'DRAFT'}});
 await prisma.knowledgeItem.create({data:{id:'item',expertProfileId:'expert',sourceType:'post',sourceId:'post',title:'Advice',content:'Old statement',sourceVersion:1,indexedVersion:1,isIndexed:true,vectorIds:['old-vector'],metadata:{postId:'post',status:'DRAFT',isHidden:true,isPremiumOnly:true}}});
 await prisma.$executeRaw`INSERT INTO "EvidenceRevision" ("id","expertProfileId","itemId","sourceType","sourceVersion","contentHash","snapshotHash","content","publicationTimeBasis","sourceUpdatedAt","uploaderId","audience","extractorVersion") VALUES ('revision','expert','item','post',1,'synthetic-hash','synthetic-snapshot','Advice','unavailable',CURRENT_TIMESTAMP,'owner','private','synthetic-extractor')`;
 const proposal={feedback:'Expert checked',itemId:'item',sourceVersion:1,title:'Advice',content:'Accepted correction'};
 await prisma.$executeRaw`INSERT INTO "CorrectionReview" ("id","expertProfileId","submittedBy","submissionKey","requestHash","proposal") VALUES ('review','expert','owner','seed','synthetic',${JSON.stringify(proposal)}::jsonb)`;
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

import { releasePersona,previewPersonaRollback } from '@/lib/persona/store';
import { resolveReleasedPresentation } from '@/lib/persona/serving';
import { manifestHash } from '@/lib/persona/manifest';
async function emptySources(){await prisma.$executeRawUnsafe('TRUNCATE "KnowledgeItem","EvidenceRevision","EvidenceAssertion","EvidenceSpan","EvidenceSupport","EvidenceDecisionCase","TemporalStance"');}
const publish=(operationKey:string,expectedHead:string|null,rollbackTo?:string)=>releasePersona({expertProfileId:'expert',actorId:'owner',operationKey,expectedHead,rollbackTo});
test('native v2 rollback restores captured model, persona, null greeting and widget without restoring live widget settings',async()=>{
 await emptySources();process.env.OPENAI_MODEL='synthetic-model-A';
 await prisma.widgetConfig.create({data:{id:'widget',expertProfileId:'expert',greeting:'Widget A'}});
 const a=await publish('A',null);expect(a.manifest.greetings).toEqual({chat:null,widget:'Widget A'});
 process.env.OPENAI_MODEL='synthetic-model-B';await prisma.widgetConfig.update({where:{id:'widget'},data:{greeting:'Widget B'}});await prisma.expertProfile.update({where:{id:'expert'},data:{twinGreeting:'Chat B',displayName:'Draft B'}});
 const b=await publish('B',a.id);expect(b.manifest.runtime!.generation.model).toBe('synthetic-model-B');
 expect(await previewPersonaRollback({expertProfileId:'expert',actorId:'owner',expectedHead:b.id,rollbackTo:a.id})).toMatchObject({allowed:true});
 const rollback=await publish('rollback',b.id,a.id);expect(rollback.manifest.runtime).toEqual(a.manifest.runtime);expect(rollback.manifest.greetings).toEqual(a.manifest.greetings);expect(rollback.manifest.renderedPersona).toEqual(a.manifest.renderedPersona);expect(rollback.manifest.identity).toEqual(a.manifest.identity);
 expect(await resolveReleasedPresentation('expert')).toMatchObject({greeting:null,widgetGreeting:'Widget A'});expect(await prisma.widgetConfig.findUnique({where:{id:'widget'}})).toMatchObject({greeting:'Widget B'});
 expect(await publish('rollback',b.id,a.id)).toEqual(rollback);
 await expect(publish('stale',b.id,a.id)).rejects.toThrow('head changed');
 await prisma.expertProfile.update({where:{id:'expert'},data:{ragEnabled:false}});await expect(publish('rag',rollback.id,a.id)).rejects.toThrow('RAG permission');
});
test('native release head CAS permits exactly one concurrent owner publication',async()=>{
 await emptySources();const results=await Promise.allSettled([publish('one',null),publish('two',null)]);expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(results.filter(x=>x.status==='rejected')).toHaveLength(1);
});
test('native legacy rollback preserves v1 and unsupported v2 is rejected before mutation',async()=>{
 await emptySources();const a=await publish('a',null);
 const legacy={...a.manifest,format:'persona-release-v1'};delete legacy.runtime;delete legacy.greetings;
 await prisma.$executeRaw`INSERT INTO "PersonaRelease" ("id","expertProfileId","actorId","operationKey","requestHash","manifestHash","manifest") VALUES ('legacy','expert','owner','legacy','fixture',${manifestHash(legacy)},${JSON.stringify(legacy)}::jsonb)`;
 const b=await publish('legacy-back',a.id,'legacy');expect(b.manifest.format).toBe('persona-release-v1');expect(b.manifest.runtime).toBeUndefined();
 const bad={...a.manifest,runtime:{...a.manifest.runtime,retrieval:{...a.manifest.runtime!.retrieval,contract:'future'}}};
 await prisma.$executeRaw`INSERT INTO "PersonaRelease" ("id","expertProfileId","actorId","operationKey","requestHash","manifestHash","manifest") VALUES ('bad','expert','owner','bad','fixture',${manifestHash(bad)},${JSON.stringify(bad)}::jsonb)`;
 await expect(publish('bad-back',b.id,'bad')).rejects.toThrow('runtime');expect(await resolveReleasedPresentation('expert')).toMatchObject({releaseId:b.id});
 await expect(prisma.$executeRaw`UPDATE "PersonaRelease" SET "manifestHash"='tampered' WHERE "id"=${a.id}`).rejects.toThrow('append-only');
});
test.each(['pdf','blog'])('native %s submission captures immutable parsed provenance without changing beliefs; retry survives deletion',async sourceType=>{
 await prisma.knowledgeItem.update({where:{id:'item'},data:{sourceType,metadata:{authorId:'spoof',audience:'private'}}});
 const input={expertProfileId:'expert',actorId:'owner',submissionKey:'import',proposal:{feedback:'Review import',itemId:'item',sourceVersion:1,title:'Proposed',content:'Changed'}};
 const before=await prisma.knowledgeItem.findUnique({where:{id:'item'}});const review=await submitCorrection(input);expect(review.state).toBe('PENDING');expect(await prisma.knowledgeItem.findUnique({where:{id:'item'}})).toEqual(before);expect(await prisma.knowledgeLifecycleJob.count()).toBe(0);
 const rows=await prisma.$queryRaw<{detail:any}[]>`SELECT "detail" FROM "CorrectionEvent" WHERE "reviewId"=${review.id}`;
 expect(rows[0].detail.importedSource).toMatchObject({sourceType,sourceVersion:1,authorId:null,binaryHash:null,attribution:'unverified-import',snapshot:{content:'Old statement'}});
 await expect(decideCorrection({...decision,reviewId:review.id})).rejects.toThrow('unsupported');
 await expect(prisma.$executeRaw`UPDATE "CorrectionEvent" SET "detail"='{}'::jsonb WHERE "reviewId"=${review.id}`).rejects.toThrow('append-only');
 await prisma.knowledgeItem.delete({where:{id:'item'}});expect(await submitCorrection(input)).toEqual(review);expect(await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "CorrectionEvent" WHERE "reviewId"=${review.id}`).toEqual([{count:1}]);
});
test('native stale/foreign/oversized import submissions leave no review audit or source mutation',async()=>{
 await prisma.knowledgeItem.update({where:{id:'item'},data:{sourceType:'pdf'}});
 const submit=(itemId:string,sourceVersion:number)=>submitCorrection({expertProfileId:'expert',actorId:'owner',submissionKey:'invalid',proposal:{feedback:'Review',itemId,sourceVersion}});
 await expect(submit('item',2)).rejects.toThrow('version changed');await expect(submit('foreign',1)).rejects.toThrow('deleted or changed');
 await prisma.knowledgeItem.update({where:{id:'item'},data:{content:'é'.repeat(70000)}});await expect(submit('item',1)).rejects.toThrow('audit bound');
 expect(await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "CorrectionReview" WHERE "submissionKey"='invalid'`).toEqual([{count:0}]);expect(await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "CorrectionEvent"`).toEqual([{count:0}]);
});
test('native expert revision captures new import target while preserving original submission event',async()=>{
 const review=await submitCorrection({expertProfileId:'expert',actorId:'owner',submissionKey:'feedback',proposal:{feedback:'Initial feedback'}});
 await prisma.knowledgeItem.update({where:{id:'item'},data:{sourceType:'pdf'}});
 const revised=await decideCorrection({...decision,reviewId:review.id,action:'REVISE',proposal:{feedback:'Revised',itemId:'item',sourceVersion:1,title:'Updated',content:'Proposed'}});expect(revised).toMatchObject({state:'PENDING',version:2});
 const events=await prisma.$queryRaw<{action:string,detail:any}[]>`SELECT "action","detail" FROM "CorrectionEvent" WHERE "reviewId"=${review.id} ORDER BY "version"`;
 expect(events[0].detail.importedSource).toBeUndefined();expect(events[1].detail.importedSource).toMatchObject({sourceType:'pdf',snapshot:{content:'Old statement'}});expect(await prisma.knowledgeItem.findUnique({where:{id:'item'}})).toMatchObject({content:'Old statement',sourceVersion:1,isIndexed:true});
});
