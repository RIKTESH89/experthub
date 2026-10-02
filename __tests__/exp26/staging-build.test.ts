import { jest } from '@jest/globals';
const guard = require('../../scripts/staging/build.cjs');
const direct = `postgresql://neondb_owner:synthetic-only@${guard.DIRECT}/neondb?sslmode=require`;
const env = { PATH:process.env.PATH, VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:guard.BRANCH,VERCEL_BRANCH_URL:'synthetic-branch.vercel.app',EXPERTHUB_STAGING_MIGRATE:'1',DIRECT_URL:direct,DATABASE_URL:direct.replace(guard.DIRECT,guard.POOLED) };
const list=guard.migrations();
const ledger=list.map((m: {name:string;checksum:string})=>({migration_name:m.name,checksum:m.checksum,finished_at:new Date(),rolled_back_at:null}));
const identity={database:'neondb',role:'neondb_owner',version:160015,database_create:true,schema_create:true,vector_available:'0.8.0',tables:0,ledger:false};
const schema={vector_version:'0.8.0',tables_ok:true,view_ok:true,triggers:6,payment_columns:4,all_tables:42};
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
 {DIRECT_URL:direct.replace(guard.DIRECT,'production.example.invalid')}, {DATABASE_URL:direct.replace('/neondb','/production')},
 {DIRECT_URL:direct.replace('neondb_owner','other_owner')}, {DIRECT_URL:direct.replace('sslmode=require','sslmode=disable')},
 {DIRECT_URL:direct.replace(guard.DIRECT,guard.POOLED)}, {DIRECT_URL:direct+'&host=production.example.invalid'},
 {DIRECT_URL:direct+'&sslmode=disable'}, {DIRECT_URL:direct+'&schema=private'}, {DIRECT_URL:direct.replace('/neondb',':5433/neondb')},
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
 const runner=jest.fn(()=>({status:1,stderr:'never-expose-this',stdout:'never-expose-this'}));expect(()=>guard.standardEngine(env,runner)).toThrow('Staging Prisma migration failed');
 const options=(runner.mock.calls[0] as unknown[])[2] as {env:Record<string,string>;stdio:string};expect(options.stdio).toBe('pipe');expect(options.env).not.toHaveProperty('OPENAI_API_KEY');
});
test.each([ledger.slice(1),[...ledger,{...ledger[0]}],ledger.map((row:object,index:number)=>index?row:{...row,checksum:'wrong'}),ledger.map((row:object,index:number)=>index?row:{...row,finished_at:null})])('ledger mismatch stops publication', rows=>{expect(()=>guard.verifyLedger(rows,list)).toThrow();});
test('verification failure after engine stops build and disconnects; no fabricated history',async()=>{
 const client=fake([[identity],ledger,[{...schema,triggers:0}]]);const engine=jest.fn();const build=jest.fn();await expect(guard.main(env,{makeClient:()=>client,engine,build})).rejects.toThrow('deployment stopped');expect(engine).toHaveBeenCalledTimes(1);expect(build).not.toHaveBeenCalled();expect(client.$disconnect).toHaveBeenCalledTimes(1);
});

test('existing complete history is verified before idempotent engine run; incomplete history never proceeds',async()=>{
 const client=fake([[{...identity,ledger:true,tables:43}],ledger,[schema],ledger,[schema]]);const engine=jest.fn();const build=jest.fn();const log=jest.spyOn(console,'log').mockImplementation(()=>{});
 try {await guard.main(env,{makeClient:()=>client,engine,build});expect(engine).toHaveBeenCalledTimes(1);expect(build).toHaveBeenCalledTimes(1);}finally{log.mockRestore();}
 const bad=fake([[{...identity,ledger:true,tables:43}],ledger.slice(1)]);const never=jest.fn();await expect(guard.main(env,{makeClient:()=>bad,engine:never,build})).rejects.toThrow('deployment stopped');expect(never).not.toHaveBeenCalled();
});
test('successful standard engine invokes only migrate deploy with isolated environment',()=>{
 const runner=jest.fn(()=>({status:0,stdout:'private output discarded'}));guard.standardEngine({...env,OPENAI_API_KEY:'synthetic-never-forward'},runner);
 const args=runner.mock.calls[0] as unknown[];expect(args[1]).toEqual(['node_modules/prisma/build/index.js','migrate','deploy','--schema','prisma/schema.prisma']);expect((args[2] as {env:object}).env).not.toHaveProperty('OPENAI_API_KEY');
});
test('client construction failure is sanitized and never starts engine or build',async()=>{
 const engine=jest.fn();const build=jest.fn();await expect(guard.main(env,{makeClient:()=>{throw Error('secret-from-driver');},engine,build})).rejects.toThrow('Staging migration validation or execution failed');expect(engine).not.toHaveBeenCalled();expect(build).not.toHaveBeenCalled();
});
