import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { syncPostSource, withPostOutbox } from '@/lib/knowledge/lifecycle';
import { decideCorrection } from '@/lib/corrections/service';
// Real source transactions, enqueue SQL and evidence retirement; no provider/vector execution.
jest.mock('@/lib/vector/indexer',()=>({plannedVectorIds:()=>['synthetic-next'],indexDocument:()=>{throw Error('Provider prohibited');},removeDocument:()=>{throw Error('Provider prohibited');}}));
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
 await prisma.$executeRawUnsafe('ALTER TABLE "KnowledgeLifecycleJob" ADD FOREIGN KEY ("expertProfileId") REFERENCES "ExpertProfile"("id")');
 await prisma.$executeRawUnsafe('CREATE TABLE "EvidenceRevision" ("id" TEXT PRIMARY KEY,"expertProfileId" TEXT NOT NULL,"itemId" TEXT NOT NULL,"retiredAt" TIMESTAMP(3))');
 await prisma.$executeRawUnsafe(`CREATE TABLE "CorrectionReview" ("id" TEXT PRIMARY KEY,"expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id"),"submittedBy" TEXT NOT NULL,"requestHash" TEXT NOT NULL,"proposal" JSONB NOT NULL,"state" TEXT NOT NULL DEFAULT 'PENDING',"version" INTEGER NOT NULL DEFAULT 1)`);
 await prisma.$executeRawUnsafe(`CREATE TABLE "CorrectionEvent" ("id" TEXT PRIMARY KEY,"reviewId" TEXT NOT NULL REFERENCES "CorrectionReview"("id"),"expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id"),"actorId" TEXT NOT NULL,"operationKey" TEXT NOT NULL,"requestHash" TEXT NOT NULL,"action" TEXT NOT NULL,"version" INTEGER NOT NULL,"detail" JSONB NOT NULL,UNIQUE("expertProfileId","operationKey"))`);
 await prisma.expertProfile.create({data:{id:'expert',userId:'owner',displayName:'Synthetic',specialty:[],vectorNamespace:'synthetic-ns'}});
});
beforeEach(async()=>{
 await prisma.$executeRawUnsafe('TRUNCATE "Post","KnowledgeItem","KnowledgeLifecycleJob","EvidenceRevision","CorrectionEvent","CorrectionReview"');
 await prisma.post.create({data:{id:'post',authorId:'owner',title:'Advice',content:'Old statement',isRagEnabled:true,isPremiumOnly:true,isHidden:true,status:'DRAFT'}});
 await prisma.knowledgeItem.create({data:{id:'item',expertProfileId:'expert',sourceType:'post',sourceId:'post',title:'Advice',content:'Old statement',sourceVersion:1,indexedVersion:1,isIndexed:true,vectorIds:['old-vector'],metadata:{postId:'post',status:'DRAFT',isHidden:true,isPremiumOnly:true}}});
 await prisma.$executeRaw`INSERT INTO "EvidenceRevision" ("id","expertProfileId","itemId") VALUES ('revision','expert','item')`;
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
