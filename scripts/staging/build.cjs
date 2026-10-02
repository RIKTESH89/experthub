// No credential output. Standard Prisma engine owns migration history and locking.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { previewOriginFromHost } = require('../../preview-environment.cjs');
const BRANCH = 'exp25-26-launch-auth-payments';
const DIRECT = 'ep-quiet-bread-b3rqji3g.c-4.ap-southeast-1.aws.neon.tech';
const POOLED = 'ep-quiet-bread-b3rqji3g-pooler.c-4.ap-southeast-1.aws.neon.tech';
const EXPECTED_COUNT = 15;
const vectorSupported = v => /^0\.(?:[5-9]|[1-9][0-9]+)\./.test(v || '');
const ROOT = path.resolve(__dirname, '../..');
const CODES = Object.freeze(['ENVIRONMENT','BRANCH','FLAG','BRANCH_URL_MISSING','BRANCH_URL_FORMAT','URL_MISSING','URL_FORMAT','URL_PROTOCOL','URL_PORT','URL_HOST','URL_DATABASE','URL_ROLE','URL_PASSWORD','URL_QUERY','URL_TLS','MANIFEST','PRISMA_VERSION','CLIENT_INIT','PREFLIGHT_QUERY','PREFLIGHT_EMPTY','PREFLIGHT_DATABASE','PREFLIGHT_ROLE','PREFLIGHT_VERSION','PREFLIGHT_PRIVILEGES','PREFLIGHT_EXTENSION','PREFLIGHT_NONEMPTY','LEDGER_QUERY','LEDGER_COUNT','LEDGER_CHECKSUM','LEDGER_COMPLETION','SCHEMA_QUERY','SCHEMA_EXTENSION','SCHEMA_TABLES','SCHEMA_VIEW','SCHEMA_TRIGGERS','SCHEMA_PAYMENT','ENGINE','DISCONNECT','BUILD','INTERNAL']);
class GuardError extends Error {
 constructor(code) { super(`Staging migration validation or execution failed; deployment stopped. [${CODES.includes(code) ? code : 'INTERNAL'}] No reset or retry attempted.`); this.code=CODES.includes(code) ? code : 'INTERNAL'; }
}
function fail(code='INTERNAL') { throw new GuardError(code); }
function diagnostic(error) { return error instanceof GuardError && CODES.includes(error.code) ? error.code : 'INTERNAL'; }
async function checked(code, action) { try { return await action(); } catch(error) { if(error instanceof GuardError) throw error; fail(code); } }
function validateVersions(prisma,client) { if(prisma!=='6.19.2' || client!=='6.19.2')fail('PRISMA_VERSION'); }
function selected(env) { return env.VERCEL_ENV === 'preview' && env.VERCEL_GIT_COMMIT_REF === BRANCH && env.EXPERTHUB_STAGING_MIGRATE === '1'; }
function validateUrl(raw, direct) {
 if(typeof raw!=='string' || raw.length===0)fail('URL_MISSING');
 let u; try { u = new URL(raw); } catch { fail('URL_FORMAT'); }
 if(!['postgres:', 'postgresql:'].includes(u.protocol) || u.hash)fail('URL_PROTOCOL');
 if(u.port && u.port!=='5432')fail('URL_PORT');
 if(![DIRECT,...(direct ? [] : [POOLED])].includes(u.hostname))fail('URL_HOST');
 if(u.pathname!=='/neondb')fail('URL_DATABASE');
 let role;try {role=decodeURIComponent(u.username);}catch{fail('URL_ROLE');}
 if(role!=='neondb_owner')fail('URL_ROLE');
 if(!u.password)fail('URL_PASSWORD');
 const allowed = ['sslmode','channel_binding','schema','pgbouncer','connect_timeout','pool_timeout','connection_limit'];
 const seen = new Set();
 for (const [key, value] of u.searchParams) {
  if (!allowed.includes(key) || seen.has(key)) fail('URL_QUERY'); seen.add(key);
  if (key === 'schema' && value !== 'public') fail('URL_QUERY');
  if (key === 'channel_binding' && value !== 'require') fail('URL_QUERY');
  if (key === 'pgbouncer' && (direct || value !== 'true')) fail('URL_QUERY');
  if (['connect_timeout','pool_timeout','connection_limit'].includes(key) && (!/^[1-9][0-9]*$/.test(value) || Number(value)>60)) fail('URL_QUERY');
 }
 if (!['require','verify-ca','verify-full'].includes(u.searchParams.get('sslmode'))) fail('URL_TLS');
 return raw;
}
function validate(env) {
 if(env.VERCEL_ENV!=='preview')fail('ENVIRONMENT');
 if(env.VERCEL_GIT_COMMIT_REF!==BRANCH)fail('BRANCH');
 if(env.EXPERTHUB_STAGING_MIGRATE!=='1')fail('FLAG');
 if(!env.VERCEL_BRANCH_URL)fail('BRANCH_URL_MISSING');
 try {previewOriginFromHost(env.VERCEL_BRANCH_URL);}catch{fail('BRANCH_URL_FORMAT');}
 return { direct: validateUrl(env.DIRECT_URL, true), runtime: validateUrl(env.DATABASE_URL, false) };
}
function migrations(root = ROOT) {
 const base = path.join(root, 'prisma/migrations');
 const list = fs.readdirSync(base).filter(n=>fs.existsSync(path.join(base,n,'migration.sql'))).sort().map(name=>{ const sql=fs.readFileSync(path.join(base,name,'migration.sql')); return {name,checksum:crypto.createHash('sha256').update(sql).digest('hex'),tables:[...sql.toString().matchAll(/CREATE TABLE \"([^\"]+)\"/g)].map(match=>match[1])}; });
 if(list.length !== EXPECTED_COUNT) fail('MANIFEST'); return list;
}
function verifyLedger(rows, list) {
 if(rows.length !== list.length) fail('LEDGER_COUNT');
 for(const expected of list) {
  const matching=rows.filter(row=>row.migration_name===expected.name);
  if(matching.length!==1)fail('LEDGER_COUNT');
  if(matching[0].checksum!==expected.checksum)fail('LEDGER_CHECKSUM');
  if(!matching[0].finished_at || matching[0].rolled_back_at)fail('LEDGER_COMPLETION');
 }
}
async function verify(client, list) {
 const expectedTables=[...new Set(list.flatMap(m=>m.tables))];
 if(expectedTables.length!==42 || expectedTables.some(name=>!/^\w+$/.test(name)))fail('MANIFEST');
 const tableLiterals=expectedTables.map(name=>`'${name}'`).join(',');
 const rows = await checked('LEDGER_QUERY',()=>client.$queryRawUnsafe('SELECT migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations'));
 verifyLedger(rows,list);
 const checks = await checked('SCHEMA_QUERY',()=>client.$queryRawUnsafe(`SELECT
 (SELECT extversion FROM pg_extension WHERE extname='vector') AS vector_version,
 to_regclass('public."User"') IS NOT NULL AND to_regclass('public."VectorChunk"') IS NOT NULL AND
 to_regclass('public."EvidenceRevision"') IS NOT NULL AND to_regclass('public."EvidenceSpan"') IS NOT NULL AND
 to_regclass('public."TemporalStance"') IS NOT NULL AND to_regclass('public."EvidenceDecisionCase"') IS NOT NULL AND
 to_regclass('public."PaymentEvent"') IS NOT NULL AND to_regclass('public."KnowledgeLifecycleJob"') IS NOT NULL AS tables_ok,
 EXISTS(SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='EvidenceEdge') AS view_ok,
 (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal AND tgname IN
 ('EvidenceRevision_immutable','EvidenceSpan_immutable','EvidenceAssertion_immutable','EvidenceSupport_immutable','TemporalStance_immutable','EvidenceDecisionCase_immutable')) AS triggers,
 (SELECT count(*)::int FROM information_schema.columns WHERE table_schema='public' AND table_name='ExpertSubscription' AND column_name IN ('paidPeriodStart','renewalCancelledAt','lastPaymentEventAt','lastPaymentEventRank')) AS payment_columns,
 (SELECT count(*)::int FROM pg_tables WHERE schemaname='public' AND tablename IN (${tableLiterals})) AS all_tables`));
 const row=checks[0];
 if(!row)fail('SCHEMA_QUERY');
 if(!vectorSupported(row.vector_version))fail('SCHEMA_EXTENSION');
 if(!row.tables_ok || Number(row.all_tables)!==expectedTables.length)fail('SCHEMA_TABLES');
 if(!row.view_ok)fail('SCHEMA_VIEW');
 if(Number(row.triggers)!==6)fail('SCHEMA_TRIGGERS');
 if(Number(row.payment_columns)!==4)fail('SCHEMA_PAYMENT');
}
async function preflight(client,list) {
 // PostgreSQL identity functions return catalog type name; cast for Prisma raw decoding.
 const rows = await checked('PREFLIGHT_QUERY',()=>client.$queryRawUnsafe(`SELECT current_database()::text AS database, current_user::text AS role,
 current_setting('server_version_num')::int AS version,
 has_database_privilege(current_user,current_database(),'CREATE') AS database_create,
 has_schema_privilege(current_user,'public','CREATE') AS schema_create,
 (SELECT default_version FROM pg_available_extensions WHERE name='vector') AS vector_available,
 (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS tables,
 to_regclass('public._prisma_migrations') IS NOT NULL AS ledger`));
 const row=rows[0];
 if(!row)fail('PREFLIGHT_EMPTY');
 if(row.database!=='neondb')fail('PREFLIGHT_DATABASE');
 if(row.role!=='neondb_owner')fail('PREFLIGHT_ROLE');
 if(Number(row.version)<160000 || Number(row.version)>=170000)fail('PREFLIGHT_VERSION');
 if(!row.database_create || !row.schema_create)fail('PREFLIGHT_PRIVILEGES');
 if(!vectorSupported(row.vector_available))fail('PREFLIGHT_EXTENSION');
 if(row.ledger) await verify(client,list); else if(Number(row.tables)!==0)fail('PREFLIGHT_NONEMPTY');
}
function standardEngine(env, run=spawnSync) {
 // Minimal child environment. Provider tokens and inherited dotenv paths are not forwarded.
 const childEnv={PATH:env.PATH,NODE_ENV:'production',DATABASE_URL:env.DATABASE_URL,DIRECT_URL:env.DIRECT_URL,DOTENV_CONFIG_PATH:'/dev/null'};
 const result=run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--schema','prisma/schema.prisma'],{cwd:ROOT,env:childEnv,stdio:'pipe',encoding:'utf8'});
 // Never forward stdout/stderr: database engine errors may contain credentials or SQL payloads.
 if(result.error || result.status!==0)fail('ENGINE');
}
async function main(env=process.env,deps={}) {
 const build=deps.build || (()=>{const r=spawnSync('npm',['run','build:app'],{cwd:ROOT,env,stdio:'inherit'});if(r.error||r.status!==0)fail('BUILD');});
 if(!selected(env)) { console.log('Staging guard: BUILD_ONLY'); await checked('BUILD',build); return 'build-only'; }
 console.log('Staging guard: SELECTED');
 const urls=validate(env); const list=await checked('MANIFEST',()=>migrations());
 await checked('PRISMA_VERSION',()=>validateVersions(require('prisma/package.json').version,require('@prisma/client/package.json').version));
 console.log('Staging guard: TARGET_VALIDATED');
 const makeClient=deps.makeClient || (url=>{const {PrismaClient}=require('@prisma/client');return new PrismaClient({datasources:{db:{url}}});});
 let client;
 try {
  client=await checked('CLIENT_INIT',()=>makeClient(urls.direct));
  await preflight(client,list);
  console.log('Staging guard: PREFLIGHT_PASSED');
  await checked('ENGINE',()=>(deps.engine || standardEngine)(env));
  console.log('Staging guard: ENGINE_COMPLETED');
  await verify(client,list);
 } catch(error) { if(error instanceof GuardError)throw error; fail('INTERNAL'); }
 finally { try { if(client) await client.$disconnect(); } catch { fail('DISCONNECT'); } }
 console.log('Staging migration verified: 15 completed checksums, expected schema, no seed.');
 await checked('BUILD',build); return 'migrated-build';
}
module.exports={selected,validate,validateUrl,migrations,verifyLedger,preflight,verify,standardEngine,main,BRANCH,DIRECT,POOLED,diagnostic,validateVersions,CODES};
if(require.main===module)main().catch(error=>{console.error(`Staging guard failure: ${diagnostic(error)}`);console.error('Guarded build stopped. No credentials or engine output are logged. No automatic retry/reset.');process.exitCode=1;});
