// Local integration only: fresh owned PostgreSQL, standard migrations, compiled app browsers.
const fs=require('fs'),path=require('path'),os=require('os'),net=require('net'),crypto=require('crypto');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../..');process.chdir(root);
const output=path.join(root,'audit/next-wave-local'),bin='/opt/homebrew/opt/postgresql@18/bin';
const owned=fs.mkdtempSync(path.join(os.tmpdir(),'experthub-next-wave-'));const data=path.join(owned,'pgdata');
const baseEnv={LC_ALL:'C',LANG:'C',PATH:process.env.PATH,HOME:process.env.HOME,DOTENV_CONFIG_PATH:'/dev/null',NEXT_TELEMETRY_DISABLED:'1'};
const url='postgresql://integration_synthetic@127.0.0.1:55447/integration_fresh';
const env={...baseEnv,DATABASE_URL:url,DIRECT_URL:url};
let started=false;
function run(exe,args,label,runEnv=env,timeout=240000){console.log('START '+label);const result=spawnSync(exe,args,{cwd:root,env:runEnv,encoding:'utf8',timeout,maxBuffer:16*1024*1024});fs.writeFileSync(path.join(output,label+'.log'),(result.stdout||'')+(result.stderr||''));if(result.error||result.status!==0)throw Error(label+' failed; see '+path.join(output,label+'.log'));console.log('PASS '+label);return result.stdout;}
const pg=(name,args,label)=>run(path.join(bin,name),args,label);
async function freePort(){await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(55447,'127.0.0.1',()=>s.close(resolve));});}
(async()=>{
 await freePort();pg('initdb',['-D',data,'-A','trust','-U','integration_synthetic','--encoding=UTF8','--locale=C'],'native-init');
 pg('pg_ctl',['-D',data,'-l',path.join(owned,'postgres.log'),'-o','-h 127.0.0.1 -p 55447 -k /tmp -c timezone=UTC','start'],'native-start');started=true;
 pg('createdb',['-h','127.0.0.1','-p','55447','-U','integration_synthetic','integration_fresh'],'native-createdb');
 const predecessor=path.join(owned,'predecessor');fs.mkdirSync(path.join(predecessor,'migrations'),{recursive:true});
 for(const name of fs.readdirSync('prisma/migrations'))if(name!=='20261003180000_billing_recovery_outbox')fs.cpSync(path.join(root,'prisma/migrations',name),path.join(predecessor,'migrations',name),{recursive:true});
 fs.copyFileSync('prisma/schema.prisma',path.join(predecessor,'schema.prisma'));
 const config=path.join(root,'scripts/next-wave-local/predecessor.config.ts');
 fs.writeFileSync(config,`import {defineConfig} from 'prisma/config'; export default defineConfig({schema:${JSON.stringify(path.join(predecessor,'schema.prisma'))},migrations:{path:${JSON.stringify(path.join(predecessor,'migrations'))}},engine:'classic',datasource:{url:process.env.DATABASE_URL!}});`);
 try{run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--config',config],'native-predecessor16');}finally{fs.unlinkSync(config);}
 const guard=require('../staging/build.cjs'),{PrismaClient}=require('@prisma/client');const client=new PrismaClient({datasources:{db:{url}}});
 try{await guard.verify(client,guard.migrations().slice(0,-1));console.log('PASS native-verified16');run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],'native-upgrade17');await guard.verify(client,guard.migrations());
 const ledger=await client.$queryRawUnsafe('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name');fs.writeFileSync(path.join(output,'migration-ledger.json'),JSON.stringify(ledger,null,2));console.log('PASS native-verified17');}finally{await client.$disconnect();}
 run(process.execPath,['node_modules/jest/bin/jest.js','--config','scripts/launch-integration/jest.exp16.cjs','--runInBand','--json','--outputFile','audit/next-wave-local/native16.json'],'native16');
 pg('createdb',['-h','127.0.0.1','-p','55447','-U','integration_synthetic','integration_exp14'],'native-exp14-createdb');
 const exp14URL=url.replace('integration_fresh','integration_exp14');run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],'native-exp14-migrations',{...env,DATABASE_URL:exp14URL,DIRECT_URL:exp14URL});
 run(process.execPath,['node_modules/jest/bin/jest.js','--config','scripts/launch-integration/jest.exp14.cjs','--runInBand','--json','--outputFile','audit/next-wave-local/native14.json'],'native14');
 const buildEnv={...env,VERCEL_ENV:'production',AUTH_SECRET:'synthetic-integration-only',AUTH_TRUST_HOST:'true',AUTH_URL:'http://127.0.0.1:3357',NEXT_PUBLIC_APP_URL:'https://experthub.co.in',GOOGLE_CLIENT_ID:'123456-synthetic.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'synthetic-only',NEXT_FONT_GOOGLE_MOCKED_RESPONSES:path.join(root,'scripts/exp25-26/font-mock.cjs'),NODE_OPTIONS:'--require='+path.join(root,'scripts/exp25-26/network-guard.cjs')};
 run(process.execPath,['scripts/staging/build.cjs'],'production-build',buildEnv);
 run(process.execPath,['scripts/launch-integration/production-browser.cjs'],'production-browser',baseEnv);
 const host='experthub-git-exp25-26-launch-au-e842c4-riktesh-singhs-projects.vercel.app';
 const previewEnv={...buildEnv,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'exp25-26-launch-auth-payments',VERCEL_BRANCH_URL:host,EXPERTHUB_STAGING_GOOGLE_ENABLED:'1',EXPERTHUB_STAGING_GOOGLE_CLIENT_ID:'123456-synthetic.apps.googleusercontent.com',EXPERTHUB_STAGING_GOOGLE_APPROVED_CLIENT_ID:'123456-synthetic.apps.googleusercontent.com',EXPERTHUB_STAGING_GOOGLE_CLIENT_SECRET:'synthetic-only'};
 run(process.execPath,['scripts/staging/build.cjs'],'preview-build',previewEnv);
 run(process.execPath,['scripts/launch-integration/built-browser.cjs'],'preview-browser',baseEnv);
 fs.writeFileSync(path.join(output,'native-build-result.json'),JSON.stringify({status:'passed',ownedCluster:owned,predecessorMigrations:16,currentMigrations:17,applicationTables:49,experimentalDialogueDefault:false,hostedChanges:false},null,2));
})().catch(error=>{fs.writeFileSync(path.join(output,'native-build-failure.txt'),error.stack+'\n');console.error(error.message);process.exitCode=1;}).finally(()=>{if(started)pg('pg_ctl',['-D',data,'stop','-m','fast'],'native-stop');console.log('Owned cluster stopped; retained files '+owned);});
