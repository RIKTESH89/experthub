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
function fail() { throw new Error('Staging migration safety check failed'); }
function selected(env) { return env.VERCEL_ENV === 'preview' && env.VERCEL_GIT_COMMIT_REF === BRANCH && env.EXPERTHUB_STAGING_MIGRATE === '1'; }
function validateUrl(raw, direct) {
 let u; try { u = new URL(raw); } catch { fail(); }
 if (!['postgres:', 'postgresql:'].includes(u.protocol) || u.hash || (u.port && u.port !== '5432') ||
     ![DIRECT, ...(direct ? [] : [POOLED])].includes(u.hostname) || u.pathname !== '/neondb' ||
     decodeURIComponent(u.username) !== 'neondb_owner' || !u.password) fail();
 const allowed = ['sslmode','channel_binding','schema','pgbouncer','connect_timeout','pool_timeout','connection_limit'];
 const seen = new Set();
 for (const [key, value] of u.searchParams) {
  if (!allowed.includes(key) || seen.has(key)) fail(); seen.add(key);
  if (key === 'schema' && value !== 'public') fail();
  if (key === 'channel_binding' && value !== 'require') fail();
  if (key === 'pgbouncer' && (direct || value !== 'true')) fail();
  if (['connect_timeout','pool_timeout','connection_limit'].includes(key) && (!/^[1-9][0-9]*$/.test(value) || Number(value)>60)) fail();
 }
 if (!['require','verify-ca','verify-full'].includes(u.searchParams.get('sslmode'))) fail();
 return raw;
}
function validate(env) {
 if (!selected(env)) fail(); previewOriginFromHost(env.VERCEL_BRANCH_URL);
 return { direct: validateUrl(env.DIRECT_URL, true), runtime: validateUrl(env.DATABASE_URL, false) };
}
function migrations(root = ROOT) {
 const base = path.join(root, 'prisma/migrations');
 const list = fs.readdirSync(base).filter(n=>fs.existsSync(path.join(base,n,'migration.sql'))).sort().map(name=>{ const sql=fs.readFileSync(path.join(base,name,'migration.sql')); return {name,checksum:crypto.createHash('sha256').update(sql).digest('hex'),tables:[...sql.toString().matchAll(/CREATE TABLE \"([^\"]+)\"/g)].map(match=>match[1])}; });
 if(list.length !== EXPECTED_COUNT) fail(); return list;
}
function verifyLedger(rows, list) {
 if(rows.length !== list.length) fail();
 for(const expected of list) {
  const matching=rows.filter(row=>row.migration_name===expected.name);
  if(matching.length!==1 || matching[0].checksum!==expected.checksum || !matching[0].finished_at || matching[0].rolled_back_at) fail();
 }
}
async function verify(client, list) {
 const expectedTables=[...new Set(list.flatMap(m=>m.tables))];
 if(expectedTables.length!==42 || expectedTables.some(name=>!/^\w+$/.test(name)))fail();
 const tableLiterals=expectedTables.map(name=>`'${name}'`).join(',');
 const rows = await client.$queryRawUnsafe('SELECT migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations');
 verifyLedger(rows,list);
 const checks = await client.$queryRawUnsafe(`SELECT
 (SELECT extversion FROM pg_extension WHERE extname='vector') AS vector_version,
 to_regclass('public."User"') IS NOT NULL AND to_regclass('public."VectorChunk"') IS NOT NULL AND
 to_regclass('public."EvidenceRevision"') IS NOT NULL AND to_regclass('public."EvidenceSpan"') IS NOT NULL AND
 to_regclass('public."TemporalStance"') IS NOT NULL AND to_regclass('public."EvidenceDecisionCase"') IS NOT NULL AND
 to_regclass('public."PaymentEvent"') IS NOT NULL AND to_regclass('public."KnowledgeLifecycleJob"') IS NOT NULL AS tables_ok,
 EXISTS(SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='EvidenceEdge') AS view_ok,
 (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal AND tgname IN
 ('EvidenceRevision_immutable','EvidenceSpan_immutable','EvidenceAssertion_immutable','EvidenceSupport_immutable','TemporalStance_immutable','EvidenceDecisionCase_immutable')) AS triggers,
 (SELECT count(*)::int FROM information_schema.columns WHERE table_schema='public' AND table_name='ExpertSubscription' AND column_name IN ('paidPeriodStart','renewalCancelledAt','lastPaymentEventAt','lastPaymentEventRank')) AS payment_columns,
 (SELECT count(*)::int FROM pg_tables WHERE schemaname='public' AND tablename IN (${tableLiterals})) AS all_tables`);
 const row=checks[0]; if(!row || !row.vector_version || !row.tables_ok || !row.view_ok || !vectorSupported(row.vector_version) || Number(row.triggers)!==6 || Number(row.payment_columns)!==4 || Number(row.all_tables)!==expectedTables.length)fail();
}
async function preflight(client,list) {
 const rows = await client.$queryRawUnsafe(`SELECT current_database() AS database, current_user AS role,
 current_setting('server_version_num')::int AS version,
 has_database_privilege(current_user,current_database(),'CREATE') AS database_create,
 has_schema_privilege(current_user,'public','CREATE') AS schema_create,
 (SELECT default_version FROM pg_available_extensions WHERE name='vector') AS vector_available,
 (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS tables,
 to_regclass('public._prisma_migrations') IS NOT NULL AS ledger`);
 const row=rows[0];
 if(!row || row.database!=='neondb' || row.role!=='neondb_owner' || Number(row.version)<160000 || Number(row.version)>=170000 || !row.database_create || !row.schema_create || !vectorSupported(row.vector_available))fail();
 if(row.ledger) await verify(client,list); else if(Number(row.tables)!==0)fail();
}
function standardEngine(env, run=spawnSync) {
 // Minimal child environment. Provider tokens and inherited dotenv paths are not forwarded.
 const childEnv={PATH:env.PATH,NODE_ENV:'production',DATABASE_URL:env.DATABASE_URL,DIRECT_URL:env.DIRECT_URL,DOTENV_CONFIG_PATH:'/dev/null'};
 const result=run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--schema','prisma/schema.prisma'],{cwd:ROOT,env:childEnv,stdio:'pipe',encoding:'utf8'});
 // Never forward stdout/stderr: database engine errors may contain credentials or SQL payloads.
 if(result.error || result.status!==0)throw new Error('Staging Prisma migration failed; deployment stopped. No reset or retry attempted.');
}
async function main(env=process.env,deps={}) {
 const build=deps.build || (()=>{const r=spawnSync('npm',['run','build:app'],{cwd:ROOT,env,stdio:'inherit'});if(r.error||r.status!==0)throw new Error('Application build failed');});
 if(!selected(env)) { await build(); return 'build-only'; }
 const urls=validate(env); const list=migrations();
 if(require('prisma/package.json').version!=='6.19.2' || require('@prisma/client/package.json').version!=='6.19.2')fail();
 const makeClient=deps.makeClient || (url=>{const {PrismaClient}=require('@prisma/client');return new PrismaClient({datasources:{db:{url}}});});
 let client;
 try {
  client=makeClient(urls.direct);
  await preflight(client,list);
  (deps.engine || standardEngine)(env);
  await verify(client,list);
 } catch { throw new Error('Staging migration validation or execution failed; deployment stopped. No reset or retry attempted.'); }
 finally { try { if(client) await client.$disconnect(); } catch { throw new Error('Staging disconnect failed; deployment stopped.'); } }
 console.log('Staging migration verified: 15 completed checksums, expected schema, no seed.');
 await build(); return 'migrated-build';
}
module.exports={selected,validate,validateUrl,migrations,verifyLedger,preflight,verify,standardEngine,main,BRANCH,DIRECT,POOLED};
if(require.main===module)main().catch(()=>{console.error('Guarded build stopped. No credentials or engine output are logged. No automatic retry/reset.');process.exitCode=1;});
