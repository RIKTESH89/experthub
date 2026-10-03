#!/usr/bin/env node
'use strict';
// Owns a fresh local cluster, never accepts a database URL or an existing cluster.
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process'),assert=require('assert/strict'),{createHash}=require('crypto');
const root=path.resolve(__dirname,'../..');process.chdir(root);
const bin=process.env.EXP28_PG_BIN||'/opt/homebrew/opt/postgresql@18/bin';
const owned=fs.mkdtempSync(path.join(os.tmpdir(),'exp28-29-'));const data=path.join(owned,'data');
const output=path.join(root,'audit/exp28-29');fs.mkdirSync(output,{recursive:true});
const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('PG'))delete env[key];
Object.assign(env,{PGHOST:owned,PGPORT:'5432',PGUSER:'exp28_synthetic',PGDATABASE:'synthetic',PGCONNECT_TIMEOUT:'5',DOTENV_CONFIG_PATH:'/dev/null'});
delete env.PGSERVICE;delete env.PGSERVICEFILE;delete env.PGPASSWORD;delete env.DATABASE_URL;delete env.DIRECT_URL;
env.DATABASE_URL=`postgresql://exp28_synthetic@localhost/synthetic?host=${encodeURIComponent(owned)}`;env.DIRECT_URL=env.DATABASE_URL;
function run(exe,args,label,runEnv=env){const r=spawnSync(exe,args,{env:runEnv,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});fs.writeFileSync(path.join(output,label+'.log'),(r.stdout||'')+(r.stderr||''));if(r.error||r.status!==0)throw Error(`${label} failed; inspect audit/exp28-29/${label}.log`);return r.stdout.trim();}
const pg=(exe,args,label)=>run(path.join(bin,exe),args,label);
const sql=(statement,label,db='synthetic')=>pg('psql',['-X','-v','ON_ERROR_STOP=1','-d',db,'-Atc',statement],label);
let started=false;
try {
 pg('initdb',['-D',data,'-U','exp28_synthetic','--auth=trust','--encoding=UTF8','--locale=C'],'initdb');
 pg('pg_ctl',['-D',data,'-l',path.join(owned,'postgres.log'),'-o',`-h '' -k ${owned} -c timezone=UTC`,'start'],'start');started=true;
 pg('createdb',['synthetic'],'createdb');
 run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],'migrations');
 run(process.execPath,['node_modules/jest/bin/jest.js','--config','scripts/exp28-29/jest.config.cjs','--runInBand','--json','--outputFile',path.join(output,'jest.json')],'jest');
 // Compare every application table, excluding Prisma migration metadata.
 const tables=sql("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' ORDER BY tablename",'tables').split('\n');
 function snapshot(db,label){return tables.map((t,i)=>[t,sql(`SELECT coalesce(jsonb_agg(row ORDER BY row::text),'[]'::jsonb)::text FROM (SELECT to_jsonb(t) row FROM \"${t.replaceAll('"','""')}\" t) x`,`${label}-${i}`,db)]);}
 const before=snapshot('synthetic','before');const dump=path.join(owned,'snapshot.dump');
 const digest=snapshot=>createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
 const boundary=JSON.parse(sql(`SELECT jsonb_agg(jsonb_build_object('itemId',"itemId",'state',state,'attempts',attempts,'leaseToken',"leaseToken",'vectorIds',"vectorIds") ORDER BY "itemId")::text FROM "KnowledgeLifecycleJob" WHERE "itemId" IN ('exp28-backup-pending','exp28-backup-inflight') AND kind='INDEX'`,'backup-boundary'));
 assert.equal(boundary.length,2);assert.equal(boundary.find(j=>j.itemId==='exp28-backup-pending').state,'PENDING');assert.equal(boundary.find(j=>j.itemId==='exp28-backup-inflight').state,'RUNNING');
 const restartStart=performance.now();
 pg('pg_ctl',['-D',data,'stop','-m','immediate'],'interrupt');started=false;
 pg('pg_ctl',['-D',data,'-l',path.join(owned,'postgres.log'),'-o',`-h '' -k ${owned} -c timezone=UTC`,'start'],'restart');started=true;
 const restarted=snapshot('synthetic','restarted');assert.deepEqual(restarted,before);
 const interruptionRecoveryMs=performance.now()-restartStart;
 const start=performance.now();pg('pg_dump',['-Fc','-f',dump,'synthetic'],'dump');
 sql(`INSERT INTO "KnowledgeLifecycleJob" (id,kind,"expertProfileId","itemId",namespace,"vectorIds","updatedAt") VALUES ('after-backup','INDEX','exp28-expert','late','synthetic',ARRAY[]::text[],now())`,'post-backup-write');
 pg('createdb',['restored'],'create-restored');
 pg('pg_restore',['--exit-on-error','--no-owner','-d','restored',dump],'restore');
 const restored=snapshot('restored','restored');assert.deepEqual(restored,before);
 assert.equal(sql(`SELECT count(*) FROM "KnowledgeLifecycleJob" WHERE id='after-backup'`,'lost-write','restored'),'0');
 const backupRestoreAndVerificationMs=performance.now()-start;
 const checksums={algorithm:'SHA-256 over ordered table names and canonical full-row JSON; includes vector values, evidence, sources, jobs and lease tokens',before: digest(before),afterCrashRestart:digest(restarted),restoredBeforeReplay:digest(restored),dumpFile:createHash('sha256').update(fs.readFileSync(dump)).digest('hex'),tables:before.map(([table,rows])=>({table,rowCount:JSON.parse(rows).length,sha256:createHash('sha256').update(rows).digest('hex')}))};
 fs.writeFileSync(path.join(output,'checksums.json'),JSON.stringify(checksums,null,2));
 const restoredURL=new URL(env.DATABASE_URL);restoredURL.pathname='/restored';
 const restoredEnv={...env,PGDATABASE:'restored',DATABASE_URL:restoredURL.toString(),DIRECT_URL:restoredURL.toString()};
 const replayStart=performance.now();const replay=JSON.parse(run(process.execPath,['scripts/exp28-29/native-worker.cjs','restore-replay'],'restore-replay',restoredEnv));
 fs.writeFileSync(path.join(output,'restore-replay.json'),JSON.stringify(replay,null,2));
 fs.writeFileSync(path.join(output,'recovery.json'),JSON.stringify({status:'passed',tablesCompared:tables.length,interruptionRecoveryMs,backupRestoreAndVerificationMs,restoreIntentReplayAndVerificationMs:performance.now()-replayStart,preBackupBoundary:boundary,postBackupWritesLost:1,contentChecksumEquality:checksums.before===checksums.afterCrashRestart&&checksums.before===checksums.restoredBeforeReplay,externalSpendINR:0,cluster:owned,scope:'Disposable synthetic SQL and native pgvector snapshot, real ingestion/outbox replay with synthetic embedding adapter; excludes uploads, secrets, hosted recovery and deployment rollback',planningTargets:{recoveryHours:24,recoverableDataLossHours:24,proved:false}},null,2));
 if(fs.existsSync(path.join(output,'failure.txt')))fs.unlinkSync(path.join(output,'failure.txt'));
} catch(error) {fs.writeFileSync(path.join(output,'failure.txt'),error.stack+'\n');process.exitCode=1;}
finally {if(started)pg('pg_ctl',['-D',data,'stop','-m','fast'],'stop');console.log(`Evidence: ${output}; retained disposable cluster: ${owned}`);}
