/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the CommonJS runtime guard directly. */
import { jest } from '@jest/globals';
const guard = require('../../scripts/staging/build.cjs');
const direct = `postgresql://neondb_owner:synthetic-only@${guard.DIRECT}/neondb?sslmode=require`;
const env = { PATH:process.env.PATH, VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:guard.BRANCH,VERCEL_BRANCH_URL:'synthetic-branch.vercel.app',EXPERTHUB_STAGING_MIGRATE:'1',DIRECT_URL:direct,DATABASE_URL:direct.replace(guard.DIRECT,guard.POOLED) };
const list=guard.migrations();
const ledger=list.map((m: {name:string;checksum:string})=>({migration_name:m.name,checksum:m.checksum,finished_at:new Date(),rolled_back_at:null}));
const identity={database:'neondb',role:'neondb_owner',version:160015,database_create:true,schema_create:true,vector_available:'0.8.0',tables:0,ledger:false};
const schema={vector_version:'0.8.0',tables_ok:true,view_ok:true,triggers:8,payment_columns:5,all_tables:49};
function fake(rows: unknown[]=[ [identity],ledger,[schema] ]) {
 const query=jest.fn<(...args: unknown[])=>Promise<unknown>>(); for(const value of rows)query.mockResolvedValueOnce(value);
 return {$queryRawUnsafe:query,$disconnect:jest.fn<()=>Promise<void>>().mockResolvedValue(undefined)};
}
test.each(['production','development',undefined])('non-Preview %s is existing build only and never constructs a DB client', async target => {
 const make=jest.fn();const build=jest.fn();const engine=jest.fn();
 expect(await guard.main({...env,VERCEL_ENV:target},{makeClient:make,build,engine})).toBe('build-only');expect(make).not.toHaveBeenCalled();expect(engine).not.toHaveBeenCalled();expect(build).toHaveBeenCalledTimes(1);
});
test.each([{VERCEL_GIT_COMMIT_REF:'master'},{VERCEL_GIT_COMMIT_REF:'another-branch'},{EXPERTHUB_STAGING_MIGRATE:undefined},{EXPERTHUB_STAGING_MIGRATE:'true'}])('unselected branch/flag is build only %p', async override => {
 const make=jest.fn();const build=jest.fn();expect(await guard.main({...env,...override},{makeClient:make,build})).toBe('build-only');expect(make).not.toHaveBeenCalled();expect(build).toHaveBeenCalledTimes(1);
});
test.each([
 {DIRECT_URL:direct.replace(guard.DIRECT,'production.example.invalid')}, {DATABASE_URL:direct.replace('/neondb?','/production?')},
 {DIRECT_URL:direct.replace('neondb_owner','other_owner')}, {DIRECT_URL:direct.replace('sslmode=require','sslmode=disable')},
 {DIRECT_URL:direct.replace(guard.DIRECT,guard.POOLED)}, {DIRECT_URL:direct+'&host=production.example.invalid'},
 {DIRECT_URL:direct+'&sslmode=disable'}, {DIRECT_URL:direct+'&schema=private'}, {DIRECT_URL:direct.replace(guard.DIRECT,guard.DIRECT+':5433')},
 {VERCEL_BRANCH_URL:undefined}, {VERCEL_BRANCH_URL:'https://synthetic-branch.vercel.app'}
])('invalid staging target fails before connection %p', async override => {
 const make=jest.fn();const build=jest.fn();await expect(guard.main({...env,...override},{makeClient:make,build})).rejects.toThrow();expect(make).not.toHaveBeenCalled();expect(build).not.toHaveBeenCalled();
});
test('allowlisted fresh staging runs preflight then engine then verification then build, once', async () => {
 const client=fake();const order:string[]=[];const build=jest.fn(async()=>{order.push('build');});const engine=jest.fn(()=>{order.push('engine');});
 const query=client.$queryRawUnsafe;query.mockReset();query.mockImplementationOnce(async()=>{order.push('preflight');return [identity];}).mockImplementationOnce(async()=>{order.push('ledger');return ledger;}).mockImplementationOnce(async()=>{order.push('schema');return [schema];});
 const log=jest.spyOn(console,'log').mockImplementation(()=>{});
 try {expect(await guard.main(env,{makeClient:()=>client,engine,build})).toBe('migrated-build');expect(order).toEqual(['preflight','engine','ledger','schema','build']);expect(client.$disconnect).toHaveBeenCalledTimes(1);} finally {log.mockRestore();}
});
test.each([{database:'production'},{role:'wrong'},{version:180006},{tables:1},{vector_available:'0.4.0'},{schema_create:false}])('preflight mismatch stops engine and build %p', async override=>{
 const client=fake([[{...identity,...override}]]);const engine=jest.fn();const build=jest.fn();await expect(guard.main(env,{makeClient:()=>client,engine,build})).rejects.toThrow('deployment stopped');expect(engine).not.toHaveBeenCalled();expect(build).not.toHaveBeenCalled();expect(client.$disconnect).toHaveBeenCalled();
});
test('engine errors containing credentials are suppressed; no retry, reset, seed or build',async()=>{
 const client=fake();const engine=jest.fn(()=>{throw Error('postgresql://neondb_owner:never-expose-this@production.example.invalid/neondb');});const build=jest.fn();
 await expect(guard.main(env,{makeClient:()=>client,engine,build})).rejects.toThrow('Staging migration validation or execution failed');expect(engine).toHaveBeenCalledTimes(1);expect(build).not.toHaveBeenCalled();
 const runner=jest.fn(()=>({status:1,stderr:'never-expose-this',stdout:'never-expose-this'}));expect(()=>guard.standardEngine(env,runner)).toThrow('[ENGINE]');
 const options=(runner.mock.calls[0] as unknown[])[2] as {env:Record<string,string>;stdio:string};expect(options.stdio).toBe('pipe');expect(options.env).not.toHaveProperty('OPENAI_API_KEY');
});
test.each([ledger.slice(1),[...ledger,{...ledger[0]}],ledger.map((row:object,index:number)=>index?row:{...row,checksum:'wrong'}),ledger.map((row:object,index:number)=>index?row:{...row,finished_at:null})])('ledger mismatch stops publication', rows=>{expect(()=>guard.verifyLedger(rows,list)).toThrow();});
test('verification failure after engine stops build and disconnects; no fabricated history',async()=>{
 const client=fake([[identity],ledger,[{...schema,triggers:0}]]);const engine=jest.fn();const build=jest.fn();await expect(guard.main(env,{makeClient:()=>client,engine,build})).rejects.toThrow('deployment stopped');expect(engine).toHaveBeenCalledTimes(1);expect(build).not.toHaveBeenCalled();expect(client.$disconnect).toHaveBeenCalledTimes(1);
});

test('existing complete history is verified before idempotent engine run; incomplete history never proceeds',async()=>{
 const client=fake([[{...identity,ledger:true,tables:50}],ledger,[schema],ledger,[schema]]);const engine=jest.fn();const build=jest.fn();const log=jest.spyOn(console,'log').mockImplementation(()=>{});
 try {await guard.main(env,{makeClient:()=>client,engine,build});expect(engine).toHaveBeenCalledTimes(1);expect(build).toHaveBeenCalledTimes(1);}finally{log.mockRestore();}
 const bad=fake([[{...identity,ledger:true,tables:50}],ledger.slice(2)]);const never=jest.fn();await expect(guard.main(env,{makeClient:()=>bad,engine:never,build})).rejects.toThrow('deployment stopped');expect(never).not.toHaveBeenCalled();
});
test('successful standard engine invokes only migrate deploy with isolated environment',()=>{
 const runner=jest.fn(()=>({status:0,stdout:'private output discarded'}));guard.standardEngine({...env,OPENAI_API_KEY:'synthetic-never-forward'},runner);
 const args=runner.mock.calls[0] as unknown[];expect(args[1]).toEqual(['node_modules/prisma/build/index.js','migrate','deploy','--schema','prisma/schema.prisma']);expect((args[2] as {env:object}).env).not.toHaveProperty('OPENAI_API_KEY');
});
test('client construction failure is sanitized and never starts engine or build',async()=>{
 const engine=jest.fn();const build=jest.fn();await expect(guard.main(env,{makeClient:()=>{throw Error('secret-from-driver');},engine,build})).rejects.toThrow('Staging migration validation or execution failed');expect(engine).not.toHaveBeenCalled();expect(build).not.toHaveBeenCalled();
});

// Diagnostics expose fixed codes only, never a supplied value, URL, or raw exception.
const poison='DO_NOT_LOG_SECRET';
function expectCode(action:()=>unknown,code:string) {
 try {action();throw Error('expected rejection');}catch(error) {
  expect(guard.diagnostic(error)).toBe(code);
  expect(String(error)).not.toContain(poison);
  expect(String(error)).not.toContain('postgresql://');
 }
}
test.each([
 [{VERCEL_ENV:poison},'ENVIRONMENT'],[{VERCEL_GIT_COMMIT_REF:poison},'BRANCH'],[{EXPERTHUB_STAGING_MIGRATE:poison},'FLAG'],
 [{VERCEL_BRANCH_URL:undefined},'BRANCH_URL_MISSING'],[{VERCEL_BRANCH_URL:poison},'BRANCH_URL_FORMAT'],
])('selection validation gives safe code %s', (override,code)=>expectCode(()=>guard.validate({...env,...override}),code as string));
test.each([
 [undefined,'URL_MISSING'],[poison,'URL_FORMAT'],[direct.replace('postgresql:','https:'),'URL_PROTOCOL'],
 [direct+'#'+poison,'URL_PROTOCOL'],[direct.replace(guard.DIRECT,guard.DIRECT+':5433'),'URL_PORT'],
 [direct.replace(guard.DIRECT,poison+'.invalid'),'URL_HOST'],[direct.replace('/neondb?','/'+poison+'?'),'URL_DATABASE'],
 [direct.replace('neondb_owner',poison),'URL_ROLE'],[direct.replace('neondb_owner','%ZZ'),'URL_ROLE'],
 [direct.replace(':synthetic-only',''),'URL_PASSWORD'],[direct+'&host='+poison,'URL_QUERY'],
 [direct.replace('sslmode=require','sslmode=disable'),'URL_TLS'],
])('URL rejection reports only fixed code %s', (url,code)=>expectCode(()=>guard.validateUrl(url,true),code as string));
test.each([
 [undefined,'PREFLIGHT_EMPTY'],[{database:poison},'PREFLIGHT_DATABASE'],[{role:poison},'PREFLIGHT_ROLE'],
 [{version:180000},'PREFLIGHT_VERSION'],[{database_create:false},'PREFLIGHT_PRIVILEGES'],
 [{vector_available:poison},'PREFLIGHT_EXTENSION'],[{tables:1},'PREFLIGHT_NONEMPTY'],
])('preflight mismatch is classified without values %s',async(override,code)=>{
 const client=fake([override ? [{...identity,...override}] : []]);
 try{await guard.preflight(client,list);throw Error('expected rejection');}catch(error){expect(guard.diagnostic(error)).toBe(code);expect(String(error)).not.toContain(poison);}
});
test.each([
 [{vector_version:poison},'SCHEMA_EXTENSION'],[{tables_ok:false},'SCHEMA_TABLES'],[{all_tables:0},'SCHEMA_TABLES'],
 [{view_ok:false},'SCHEMA_VIEW'],[{triggers:0},'SCHEMA_TRIGGERS'],[{payment_columns:0},'SCHEMA_PAYMENT'],
])('schema mismatch has fixed code %s',async(override,code)=>{
 const client=fake([ledger,[{...schema,...override}]]);
 try{await guard.verify(client,list);throw Error('expected rejection');}catch(error){expect(guard.diagnostic(error)).toBe(code);expect(String(error)).not.toContain(poison);}
});
test.each([
 [ledger.slice(1),'LEDGER_COUNT'],[ledger.map((r:object,i:number)=>i?r:{...r,checksum:poison}),'LEDGER_CHECKSUM'],
 [ledger.map((r:object,i:number)=>i?r:{...r,finished_at:null}),'LEDGER_COMPLETION'],
])('history diagnostics never include stored values %s',(rows,code)=>expectCode(()=>guard.verifyLedger(rows,list),code as string));
test('catalog identity results are explicitly cast to supported text',async()=>{
 const client=fake([[identity]]);await guard.preflight(client,list);
 expect(client.$queryRawUnsafe.mock.calls[0][0]).toContain('current_database()::text AS database, current_user::text AS role');
});
test('unknown/forged external errors cannot supply diagnostic text',()=>{
 expect(guard.diagnostic(Object.assign(Error(poison),{code:'URL_HOST'}))).toBe('INTERNAL');
 expect(guard.diagnostic({code:poison})).toBe('INTERNAL');
});
test('manifest and installed version diagnostics are fixed',()=>{
 expectCode(()=>guard.validateVersions(poison,'6.19.2'),'PRISMA_VERSION');
 const fs=require('fs');const os=require('os');const path=require('path');const root=fs.mkdtempSync(path.join(os.tmpdir(),'staging-manifest-'));
 try{fs.mkdirSync(path.join(root,'prisma/migrations'),{recursive:true});expectCode(()=>guard.migrations(root),'MANIFEST');}finally{fs.rmSync(root,{recursive:true});}
});
test.each(['CLIENT_INIT','PREFLIGHT_QUERY','ENGINE','LEDGER_QUERY','SCHEMA_QUERY','DISCONNECT','BUILD'])('opaque errors classify stage %s and do not leak',async code=>{
 const client=fake();const engine=jest.fn();const build=jest.fn();const makeClient=()=>client;
 const error=Object.assign(Error(poison+' postgresql://private.invalid'),{code:poison});
 const deps:{makeClient:()=>unknown;engine:()=>unknown;build:()=>unknown}={makeClient,engine,build};
 if(code==='CLIENT_INIT')deps.makeClient=()=>{throw error;};
 if(code==='PREFLIGHT_QUERY')client.$queryRawUnsafe.mockReset().mockRejectedValueOnce(error);
 if(code==='ENGINE')deps.engine=()=>{throw error;};
 if(code==='LEDGER_QUERY')client.$queryRawUnsafe.mockReset().mockResolvedValueOnce([identity]).mockRejectedValueOnce(error);
 if(code==='SCHEMA_QUERY')client.$queryRawUnsafe.mockReset().mockResolvedValueOnce([identity]).mockResolvedValueOnce(ledger).mockRejectedValueOnce(error);
 if(code==='DISCONNECT')client.$disconnect.mockRejectedValueOnce(error);
 if(code==='BUILD')deps.build=()=>{throw error;};
 const log=jest.spyOn(console,'log').mockImplementation(()=>{});
 try{await guard.main(env,deps);throw Error('expected rejection');}catch(caught){expect(guard.diagnostic(caught)).toBe(code);expect(String(caught)).not.toContain(poison);expect(JSON.stringify(log.mock.calls)).not.toContain(poison);}finally{log.mockRestore();}
});
test('standard engine failure code is safe even when stdout/stderr contain secrets',()=>{
 expectCode(()=>guard.standardEngine(env,()=>({status:1,stdout:poison,stderr:poison,error:Error(poison)})),'ENGINE');
});
test('CLI emits only safe stage and enum when a selected URL is malformed',()=>{
 const {spawnSync}=require('child_process');
 const r=spawnSync(process.execPath,['scripts/staging/build.cjs'],{env:{...env,DIRECT_URL:poison},encoding:'utf8'});
 expect(r.status).toBe(1);expect(r.stdout).toContain('Staging guard: SELECTED');expect(r.stderr).toContain('Staging guard failure: URL_FORMAT');
 expect(r.stdout+r.stderr).not.toContain(poison);expect(r.stdout+r.stderr).not.toContain('postgresql://');
});

test('verified predecessor 16 migrations upgrades without reset and verifies all 17 afterward',async()=>{
 const client=fake([[{...identity,ledger:true,tables:47}],ledger.slice(0,-1),[{...schema,triggers:8,payment_columns:4,all_tables:46}],ledger,[schema]]);
 const engine=jest.fn(),build=jest.fn();await guard.main(env,{makeClient:()=>client,engine,build});
 expect(engine).toHaveBeenCalledTimes(1);expect(build).toHaveBeenCalledTimes(1);
});
test('predecessor with untracked partial upgrade tables fails before engine',async()=>{
 const client=fake([[{...identity,ledger:true,tables:48}],ledger.slice(0,-1),[{...schema,triggers:8,payment_columns:4,all_tables:46}]]);
 const engine=jest.fn();await expect(guard.main(env,{makeClient:()=>client,engine,build:jest.fn()})).rejects.toThrow('[SCHEMA_TABLES]');expect(engine).not.toHaveBeenCalled();
});
