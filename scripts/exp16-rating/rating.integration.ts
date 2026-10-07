import prisma from '@/lib/prisma';
import { rateMessageForReview } from '@/lib/corrections/rating';
import { decideCorrection, submitCorrection } from '@/lib/corrections/service';
jest.mock('@/lib/vector/indexer',()=>({plannedVectorIds:()=>{throw Error('Provider/indexing prohibited');}}));
jest.mock('@/lib/knowledge/outbox',()=>({enqueueLifecycleJob:()=>{throw Error('Source mutation prohibited');}}));
jest.mock('@/lib/graph/evidence-store',()=>({retireEvidence:()=>{throw Error('Belief mutation prohibited');}}));
const input={actorId:'visitor',sessionId:'session',messageId:'message',rating:-1 as const};
const trace={itemId:'source',sourceVersion:1,revisionId:'revision',spanId:'span',assertionId:'assertion',chunkIds:['chunk']};
const sources=[{metadata:{expertProfileId:'expert',knowledgeItemId:'source',sourceVersion:1,vectorId:'chunk',generationAudience:'viewer',evidenceTrace:[trace]}}];
beforeAll(async()=>{
 const identity=await prisma.$queryRaw<{database:string;username:string;address:string|null}[]>`SELECT current_database() AS database,current_user AS username,inet_server_addr()::text AS address`;
 expect(identity).toEqual([{database:'exp16_rating_fixture',username:'exp16_fixture',address:null}]);
 // Minimal fixture tables for only the model fields read by the real adapter. No User, role, knowledge or live source tables.
 const fixture=[
  'CREATE TABLE "ExpertProfile" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL)',
  'CREATE TABLE "ChatSession" ("id" TEXT PRIMARY KEY,"subscriberId" TEXT NOT NULL,"expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id") ON DELETE CASCADE,"title" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"isTrial" BOOLEAN NOT NULL DEFAULT false)',
  'CREATE TABLE "ChatMessage" ("id" TEXT PRIMARY KEY,"chatSessionId" TEXT NOT NULL REFERENCES "ChatSession"("id") ON DELETE CASCADE,"senderId" TEXT,"role" TEXT NOT NULL,"content" TEXT NOT NULL,"sources" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"rating" INTEGER)',
  'CREATE TABLE "EvidenceRevision" ("id" TEXT PRIMARY KEY,"expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id"),"itemId" TEXT NOT NULL,"sourceVersion" INTEGER NOT NULL)',
  'CREATE TABLE "EvidenceSpan" ("id" TEXT PRIMARY KEY,"revisionId" TEXT NOT NULL REFERENCES "EvidenceRevision"("id") ON DELETE CASCADE,"chunkIds" TEXT[] NOT NULL)',
  'CREATE TABLE "EvidenceAssertion" ("id" TEXT PRIMARY KEY,"expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id"))',
  'CREATE TABLE "EvidenceSupport" ("assertionId" TEXT NOT NULL REFERENCES "EvidenceAssertion"("id") ON DELETE CASCADE,"spanId" TEXT NOT NULL REFERENCES "EvidenceSpan"("id") ON DELETE CASCADE,PRIMARY KEY("assertionId","spanId"))',
 ];
 for(const statement of fixture)await prisma.$executeRawUnsafe(statement);
 // Explicit minimal fixture DDL, matching review constraints; no application migration is read or executed.
 await prisma.$executeRawUnsafe(`CREATE TABLE "CorrectionReview" (
  "id" TEXT PRIMARY KEY,"expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id") ON DELETE CASCADE,
  "submittedBy" TEXT NOT NULL,"submissionKey" TEXT NOT NULL,"requestHash" TEXT NOT NULL,"messageId" TEXT,"proposal" JSONB NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("state" IN ('PENDING','ACCEPTED','REJECTED')),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("expertProfileId","submittedBy","submissionKey"),UNIQUE ("expertProfileId","id"))`);
 await prisma.$executeRawUnsafe(`CREATE TABLE "CorrectionEvent" (
  "id" TEXT PRIMARY KEY,"reviewId" TEXT NOT NULL,"expertProfileId" TEXT NOT NULL,"actorId" TEXT NOT NULL,
  "operationKey" TEXT NOT NULL,"requestHash" TEXT NOT NULL,"action" TEXT NOT NULL CHECK ("action" IN ('SUBMIT','REVISE','ACCEPT','REJECT')),
  "version" INTEGER NOT NULL,"detail" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("expertProfileId","operationKey"),FOREIGN KEY ("expertProfileId","reviewId") REFERENCES "CorrectionReview"("expertProfileId","id") ON DELETE CASCADE)`);
 await prisma.$executeRawUnsafe(`CREATE FUNCTION exp16_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'EXP16 audit records are append-only'; END $$`);
 await prisma.$executeRawUnsafe('CREATE TRIGGER "CorrectionEvent_append_only" BEFORE UPDATE ON "CorrectionEvent" FOR EACH ROW EXECUTE FUNCTION exp16_append_only()');
 await prisma.$executeRaw`INSERT INTO "ExpertProfile" ("id","userId") VALUES ('expert','owner'),('foreign','foreign-owner')`;
});
beforeEach(async()=>{
 await prisma.$executeRawUnsafe('TRUNCATE "CorrectionEvent","CorrectionReview","ChatMessage","ChatSession","EvidenceSupport","EvidenceSpan","EvidenceRevision","EvidenceAssertion"');
 await prisma.$executeRaw`INSERT INTO "ChatSession" ("id","subscriberId","expertProfileId") VALUES ('session','visitor','expert'),('foreign-session','stranger','foreign')`;
 await prisma.$executeRaw`INSERT INTO "ChatMessage" ("id","chatSessionId","role","content","sources") VALUES ('message','session','assistant','Synthetic answer',${JSON.stringify(sources)}::jsonb)`;
 await prisma.$executeRaw`INSERT INTO "EvidenceRevision" ("id","expertProfileId","itemId","sourceVersion") VALUES ('revision','expert','source',1),('foreign-revision','foreign','source',1)`;
 await prisma.$executeRaw`INSERT INTO "EvidenceSpan" ("id","revisionId","chunkIds") VALUES ('span','revision',ARRAY['chunk']),('foreign-span','foreign-revision',ARRAY['chunk'])`;
 await prisma.$executeRaw`INSERT INTO "EvidenceAssertion" ("id","expertProfileId") VALUES ('assertion','expert'),('foreign-assertion','foreign')`;
 await prisma.$executeRaw`INSERT INTO "EvidenceSupport" ("assertionId","spanId") VALUES ('assertion','span'),('foreign-assertion','span'),('assertion','foreign-span')`;
});
afterAll(async()=>prisma.$disconnect());
async function counts(){return prisma.$queryRaw<{reviews:number;events:number;rating:number|null}[]>`SELECT (SELECT COUNT(*)::int FROM "CorrectionReview") AS reviews,(SELECT COUNT(*)::int FROM "CorrectionEvent") AS events,(SELECT "rating" FROM "ChatMessage" WHERE "id"='message') AS rating`;}
function decision(reviewId:string){return {expertProfileId:'expert',actorId:'owner',reviewId,expectedVersion:1,operationKey:'decision',action:'REJECT' as const,reason:'Synthetic owner rejection'};}
function gate(){let open!:()=>void;const promise=new Promise<void>(r=>{open=r;});return {promise,open};}
async function waitForLock(table:"ChatSession"|"ChatMessage"){
 const deadline=Date.now()+4000;
 while(Date.now()<deadline){
  const rows=await prisma.$queryRaw<{waiting:boolean}[]>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE ${'%FROM "'+table+'"%FOR UPDATE%'}) AS waiting`;
  if(rows[0].waiting)return;
  await new Promise(r=>setTimeout(r,10));
 }
 throw Error('Request did not wait for '+table+' lock');
}
test('native simultaneous repeats create one candidate and one immutable supported audit',async()=>{
 const results=await Promise.all(Array.from({length:8},()=>rateMessageForReview(input)));expect(new Set(results.map(r=>r.reviewId)).size).toBe(1);expect(await counts()).toEqual([{reviews:1,events:1,rating:-1}]);
 const rows=await prisma.$queryRaw<{detail:{provenance:{evidenceLinks:unknown[]}}}[]>`SELECT "detail" FROM "CorrectionEvent"`;
 expect(rows[0].detail.provenance.evidenceLinks).toEqual([{itemId:'source',sourceVersion:1,revisionId:'revision',spanId:'span',assertionId:'assertion',vectorId:'chunk'}]);
 await expect(prisma.$executeRaw`UPDATE "CorrectionEvent" SET "action"='REJECT'`).rejects.toThrow('append-only');
});
test('native polarity races plus reviewer decisions preserve one terminal review per polarity',async()=>{
 const first=await rateMessageForReview(input);await decideCorrection(decision(first.reviewId));
 await Promise.all([rateMessageForReview(input),rateMessageForReview({...input,rating:1}),rateMessageForReview(input),rateMessageForReview({...input,rating:1})]);
 const rows=await prisma.$queryRaw<{id:string;state:string}[]>`SELECT "id","state" FROM "CorrectionReview"`;
 expect(rows).toHaveLength(2);expect(rows.find(r=>r.id===first.reviewId)?.state).toBe('REJECTED');
 expect((await counts())[0]).toMatchObject({reviews:2,events:3});await expect(decideCorrection({...decision(first.reviewId),operationKey:'new-decision'})).rejects.toMatchObject({status:409});
});
test('native tenant joins reject foreign assertion or revision support, even when foreign support FK exists',async()=>{
 const bad=[{...sources[0],metadata:{...sources[0].metadata,evidenceTrace:[{...trace,assertionId:'foreign-assertion'},{...trace,revisionId:'foreign-revision',spanId:'foreign-span'}]}}];
 await prisma.$executeRaw`UPDATE "ChatMessage" SET "sources"=${JSON.stringify(bad)}::jsonb WHERE "id"='message'`;
 await rateMessageForReview(input);const rows=await prisma.$queryRaw<{detail:{provenance:{evidenceLinks:unknown[]}}}[]>`SELECT "detail" FROM "CorrectionEvent"`;expect(rows[0].detail.provenance.evidenceLinks).toEqual([]);
});
test('native rollback removes candidate and audit when final rating update fails',async()=>{
 await prisma.$executeRawUnsafe(`ALTER TABLE "ChatMessage" ADD CONSTRAINT synthetic_rating_failure CHECK ("rating" IS NULL)`);
 try{await expect(rateMessageForReview(input)).rejects.toThrow();expect(await counts()).toEqual([{reviews:0,events:0,rating:null}]);}
 finally{await prisma.$executeRawUnsafe('ALTER TABLE "ChatMessage" DROP CONSTRAINT synthetic_rating_failure');}
});
test.each(['rating','direct-feedback'])('native session authorization change while %s waits fails closed',async path=>{
 const locked=gate(),release=gate();
 const writer=prisma.$transaction(async tx=>{await tx.$executeRaw`UPDATE "ChatSession" SET "subscriberId"='stranger' WHERE "id"='session'`;locked.open();await release.promise;});
 await locked.promise;
 const request=path==='rating'?rateMessageForReview(input):submitCorrection({expertProfileId:'expert',actorId:'visitor',messageId:'message',submissionKey:'feedback',proposal:{feedback:'Synthetic'}});
 const outcome=request.then(()=>({status:200}),e=>({status:e.status}));
 try{await waitForLock("ChatSession");}finally{release.open();await writer;}
 expect(await outcome).toEqual({status:403});expect(await counts()).toEqual([{reviews:0,events:0,rating:null}]);
});
test('native parent-first deletion and rating have no child-parent deadlock or orphan candidate',async()=>{
 const locked=gate(),release=gate();
 const deleter=prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT "id" FROM "ChatSession" WHERE "id"='session' FOR UPDATE`;locked.open();await release.promise;await tx.$executeRaw`DELETE FROM "ChatSession" WHERE "id"='session'`;});
 await locked.promise;const outcome=rateMessageForReview(input).then(()=>({status:200}),e=>({status:e.status}));
 try{await waitForLock("ChatSession");}finally{release.open();await deleter;}
 expect(await outcome).toEqual({status:403});expect(await counts()).toEqual([{reviews:0,events:0,rating:null}]);
});
test('native unique review keys and composite event tenant FK reject duplicates and cross-tenant audit injection',async()=>{
 await rateMessageForReview(input);
 await expect(prisma.$executeRaw`INSERT INTO "CorrectionReview" ("id","expertProfileId","submittedBy","submissionKey","requestHash","proposal") SELECT 'duplicate',"expertProfileId","submittedBy","submissionKey","requestHash","proposal" FROM "CorrectionReview"`).rejects.toThrow();
 await expect(prisma.$executeRaw`INSERT INTO "CorrectionEvent" ("id","reviewId","expertProfileId","actorId","operationKey","requestHash","action","version","detail") SELECT 'foreign-event',"id",'foreign','foreign-owner','injection','hash','SUBMIT',1,'{}'::jsonb FROM "CorrectionReview"`).rejects.toThrow();
 expect((await counts())[0]).toMatchObject({reviews:1,events:1});
});

test('native direct feedback refuses message reparenting after locking its old session',async()=>{
 await prisma.$executeRaw`INSERT INTO "ChatSession" ("id","subscriberId","expertProfileId") VALUES ('another-session','visitor','expert')`;
 const locked=gate(),release=gate();
 const writer=prisma.$transaction(async tx=>{await tx.$executeRaw`UPDATE "ChatMessage" SET "chatSessionId"='another-session' WHERE "id"='message'`;locked.open();await release.promise;});
 await locked.promise;
 const outcome=submitCorrection({expertProfileId:'expert',actorId:'visitor',messageId:'message',submissionKey:'feedback',proposal:{feedback:'Synthetic'}}).then(()=>({status:200}),e=>({status:e.status}));
 try{await waitForLock("ChatMessage");}finally{release.open();await writer;}
 expect(await outcome).toEqual({status:403});expect(await counts()).toEqual([{reviews:0,events:0,rating:null}]);
});
test('native trace-only fallback links validated support and excludes a foreign assertion without duplicated outer pins',async()=>{
 const fallback=[{metadata:{expertProfileId:'expert',vectorId:'chunk',source:'authorized-temporal-neighbor',generationAudience:'viewer',evidenceTrace:[trace,{...trace,assertionId:'foreign-assertion'}]}}];
 await prisma.$executeRaw`UPDATE "ChatMessage" SET "sources"=${JSON.stringify(fallback)}::jsonb WHERE "id"='message'`;
 const result=await rateMessageForReview(input);expect(result.reviewState).toBe('PENDING');
 const rows=await prisma.$queryRaw<{detail:{provenance:{evidenceLinks:unknown[]}}}[]>`SELECT "detail" FROM "CorrectionEvent"`;
 expect(rows[0].detail.provenance.evidenceLinks).toEqual([{itemId:'source',sourceVersion:1,revisionId:'revision',spanId:'span',assertionId:'assertion',vectorId:'chunk'}]);
 expect(await counts()).toEqual([{reviews:1,events:1,rating:-1}]);
});
