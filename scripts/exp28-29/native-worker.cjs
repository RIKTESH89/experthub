'use strict';
// Separate process for the actual application's ingestion/outbox code. Only
// generateEmbedding is substituted; validation, chunking, pgvector and evidence
// publication execute unchanged. Never invoke against arbitrary DATABASE_URLs.
const path=require('path'),fs=require('fs'),os=require('os'),Module=require('module'),assert=require('assert/strict'),ts=require('typescript'),{createHash}=require('crypto');
const root=path.resolve(__dirname,'../..');
const url=new URL(process.env.DATABASE_URL||'');const socket=url.searchParams.get('host');
assert(socket&&/^exp28-29-[A-Za-z0-9]+$/.test(path.basename(socket)),'Owned disposable socket required');
assert([path.resolve(os.tmpdir()),'/tmp'].includes(path.dirname(socket)),'Disposable temp parent required');
assert.equal(url.hostname,'localhost');assert.equal(url.username,'exp28_synthetic');assert(['/synthetic','/restored'].includes(url.pathname));
assert.equal(process.env.PGHOST,socket);assert(fs.existsSync(path.join(socket,'data','PG_VERSION')));
global.fetch=async()=>{throw Error('External calls prohibited in EXP28/29');};
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,...args);};
require.extensions['.ts']=function(module,file){module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);};
const embeddings=require(path.join(root,'src/lib/vector/embeddings.ts'));
let embeddingsGenerated=0;
embeddings.generateEmbedding=async()=>{embeddingsGenerated++;const vector=Array(embeddings.EMBEDDING_DIMENSIONS).fill(0);vector[0]=1;return vector;};
const prisma=require(path.join(root,'src/lib/prisma.ts')).default;
const lifecycle=require(path.join(root,'src/lib/knowledge/lifecycle.ts'));
const expert='exp28-native-expert';
const mode=process.argv[2];
async function checkpoint(name){assert(process.send,'Crash worker requires owned IPC parent');process.send({checkpoint:name,itemId:process.argv[3]});await new Promise(()=>{setInterval(()=>{},1000);});}
async function wholeDatabaseDigest(){
 const tables=await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' ORDER BY tablename`;
 const rows=[];
 for(const {tablename} of tables){
  const result=await prisma.$queryRawUnsafe(`SELECT coalesce(jsonb_agg(row ORDER BY row::text),'[]'::jsonb)::text AS contents FROM (SELECT to_jsonb(t) row FROM "${tablename.replaceAll('"','""')}" t) x`);
  rows.push([tablename,result[0].contents]);
 }
 return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}
(async()=>{
 if(mode==='crash-after-vector'){
  assert(process.send,'Crash worker requires owned IPC parent');
  const store=require(path.join(root,'src/lib/vector/client.ts')).vectorStore;
  const upsert=store.upsert.bind(store);
  store.upsert=async(...args)=>{await upsert(...args);await checkpoint('vector-committed-before-publication');};
  await lifecycle.syncKnowledgeItem(expert,process.argv[3]);
  throw Error('Crash checkpoint unexpectedly returned');
 }
 if(mode==='crash-after-publication'){
  const {enqueueLifecycleJob,runLifecycleJob}=require(path.join(root,'src/lib/knowledge/outbox.ts'));
  const {plannedVectorIds}=require(path.join(root,'src/lib/vector/indexer.ts'));
  const item=await prisma.knowledgeItem.findUniqueOrThrow({where:{id:process.argv[3]}});
  const job=await enqueueLifecycleJob({kind:'INDEX',expertProfileId:expert,itemId:item.id,sourceVersion:item.sourceVersion,namespace:'exp28-native',vectorIds:plannedVectorIds(expert,item.id,item.sourceVersion,`${item.title}\n\n${item.content}`)});
  await runLifecycleJob(job.id,expert,async job=>{await lifecycle.performIndexJob(job);await checkpoint('publication-committed-before-ack');});
  throw Error('Crash checkpoint unexpectedly returned');
 }
 if(mode==='restore-replay'){
  const ids=['exp28-backup-pending','exp28-backup-inflight'];
  const pending=await prisma.knowledgeLifecycleJob.findFirstOrThrow({where:{expertProfileId:expert,itemId:ids[0],kind:'INDEX'}});
  const inflight=await prisma.knowledgeLifecycleJob.findFirstOrThrow({where:{expertProfileId:expert,itemId:ids[1],kind:'INDEX'}});
  assert.equal(pending.state,'PENDING');assert.equal(pending.attempts,0);
  assert.equal(inflight.state,'RUNNING');assert.equal(inflight.attempts,1);assert(inflight.leaseToken);
  assert.equal(await prisma.knowledgeLifecycleJob.findUnique({where:{id:'after-backup'}}),null);
  const complete=await prisma.knowledgeLifecycleJob.findFirstOrThrow({where:{expertProfileId:expert,itemId:'exp28-native-load-0',kind:'INDEX'}});
  assert.equal(complete.state,'DONE');assert.equal(complete.attempts,1);
  assert.equal(await prisma.vectorChunk.count({where:{vectorId:{in:pending.vectorIds}}}),0);
  assert.equal(await prisma.vectorChunk.count({where:{vectorId:{in:inflight.vectorIds}}}),1);
  const before={pending:{id:pending.id,state:pending.state,attempts:pending.attempts},inflight:{id:inflight.id,state:inflight.state,attempts:inflight.attempts},vectors:await prisma.vectorChunk.count({where:{namespace:'exp28-native'}})};
  for(const id of ids){const item=await prisma.knowledgeItem.findUniqueOrThrow({where:{id}});assert.equal(item.isIndexed,false);assert.equal(item.content,`I prefer tea. Backup boundary ${id}.`);}
  const clock=new Date(inflight.leaseUntil.getTime()+1);
  for(let i=0;i<3;i++)await lifecycle.drainLifecycleJobs(expert,20,clock);
  for(const id of ids){const item=await prisma.knowledgeItem.findUniqueOrThrow({where:{id}});assert.equal(item.isIndexed,true);assert.equal(item.indexedVersion,item.sourceVersion);assert.equal(item.vectorIds.length,1);assert.equal(await prisma.vectorChunk.count({where:{vectorId:{in:item.vectorIds}}}),1);
   const revisions=await prisma.$queryRaw`SELECT "content" FROM "EvidenceRevision" WHERE "expertProfileId"=${expert} AND "itemId"=${id} AND "retiredAt" IS NULL`;
   assert.equal(revisions.length,1);assert.equal(revisions[0].content,`${item.title}\n\n${item.content}`);
  }
  const rows=await prisma.knowledgeLifecycleJob.findMany({where:{expertProfileId:expert,itemId:{in:ids},kind:'INDEX'},orderBy:{itemId:'asc'}});
  assert.equal(rows.length,2);assert(rows.every(j=>j.state==='DONE'));
  assert.equal(rows.find(j=>j.itemId===ids[0]).attempts,1);assert.equal(rows.find(j=>j.itemId===ids[1]).attempts,2);
  const after=await wholeDatabaseDigest();
  for(let i=0;i<10;i++)for(const id of ids)await lifecycle.syncKnowledgeItem(expert,id);
  await lifecycle.drainLifecycleJobs(expert,20,clock);
  const afterIdempotentReplay=await wholeDatabaseDigest();assert.equal(afterIdempotentReplay,after,'Replay must not duplicate/change any application table, including vectors and evidence supports');
  assert.equal((await prisma.knowledgeLifecycleJob.findUniqueOrThrow({where:{id:complete.id}})).attempts,1);
  console.log(JSON.stringify({status:'passed',before,recovered:rows.map(j=>({itemId:j.itemId,state:j.state,attempts:j.attempts})),idempotentReplays:20,idempotencyChecksumBefore:after,idempotencyChecksumAfter:afterIdempotentReplay,checksumScope:'All application table contents, including vector values and evidence supports',alreadyCompletedJobAttempts:1,embeddingsGenerated,adapter:'only generateEmbedding synthetic; native chunking, pgvector upsert, evidence and outbox',restoreBoundary:'Replay occurs only after whole-database snapshot equality/checksum verification'}));
 }else if(!['crash-after-vector','crash-after-publication'].includes(mode))throw Error('Unknown bounded worker mode');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await prisma.$disconnect();});
