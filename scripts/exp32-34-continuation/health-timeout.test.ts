import prisma from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';
import { billingHealth } from '@/lib/payments/billing-health';
jest.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'timeout-admin', role: 'ADMIN' } }) }));
import { GET } from '@/app/api/admin/billing/health/route';
const env = { ...process.env };
beforeEach(async () => {
 if (process.env.DATABASE_URL !== 'postgresql://billing_continuation@127.0.0.1:55439/billing_continuation') throw Error('Unsafe fixture');
 await prisma.$executeRawUnsafe('TRUNCATE "BillingOutbox", "BillingProvisioning", "User" CASCADE');
 await prisma.user.create({data:{id:'timeout-admin',email:'timeout@example.invalid',role:'ADMIN'}});
 process.env.BILLING_REVIEW_ENABLED='true';
});
afterEach(() => { process.env = { ...env }; });
afterAll(() => prisma.$disconnect());
async function bounded<T>(operation: Promise<T>) {
 let timer: ReturnType<typeof setTimeout> | undefined;
 const started = Date.now();
 // Observe rejection immediately, preventing an unhandled rejection while fixture locks are held.
 const observed = operation.then(value => ({state:'returned' as const,value}), error => ({state:'rejected' as const,error}));
 try {
  const result = await Promise.race([observed, new Promise<{state:'pending'}>(resolve => { timer=setTimeout(()=>resolve({state:'pending'}),5500); })]);
  return {result,elapsedMs:Date.now()-started,observed};
 } finally { if(timer)clearTimeout(timer); }
}
async function assertActorLockReleased() {
 await prisma.$transaction(async tx => {
  await tx.$executeRaw`SET LOCAL lock_timeout = '300ms'`;
  expect(await tx.$executeRaw`UPDATE "User" SET "name"='rollback-probe' WHERE "id"='timeout-admin'`).toBe(1);
 });
 const rows=await prisma.$queryRaw<{count:number}[]>`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND state='idle in transaction (aborted)'`;
 expect(rows[0].count).toBe(0);
}
async function holding(sql:string, action:()=>Promise<void>) {
 const writer = new PrismaClient();let release!:()=>void;let acquired!:()=>void;
 const ready=new Promise<void>(resolve=>{acquired=resolve;});const hold=new Promise<void>(resolve=>{release=resolve;});
 const locked=writer.$transaction(async tx=>{await tx.$executeRawUnsafe(sql);acquired();await hold;},{timeout:15000});
 // Also surface setup errors rather than hanging on readiness.
 const setup=locked.then(()=>{},error=>{acquired();throw error;});
 try {await ready;await action();} finally {release();await setup;await writer.$disconnect();}
}
test('database actor row lock cancels within one second and HTTP error remains generic/no-store',async()=>{
 await holding('SELECT "id" FROM "User" WHERE "id"=\'timeout-admin\' FOR UPDATE',async()=>{
  const check=await bounded(GET());
  console.log('H1_ACTOR_LOCK',JSON.stringify({state:check.result.state,elapsedMs:check.elapsedMs}));
  expect(check.result.state).toBe('returned');
  if(check.result.state==='returned'){
   expect(check.result.value.status).toBe(503);
   expect(await check.result.value.json()).toEqual({error:'Billing health unavailable'});
   expect(check.result.value.headers.get('cache-control')).toBe('private, no-store');
  }
  expect(check.elapsedMs).toBeLessThan(2500);
  const waits=await prisma.$queryRaw<{count:number}[]>`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND query LIKE '%FOR SHARE%'`;
  expect(waits[0].count).toBe(0);
 });
 await assertActorLockReleased();
});
test('blocked aggregate cancels and releases the already acquired ADMIN share lock before blocker release',async()=>{
 await holding('LOCK TABLE "BillingOutbox" IN ACCESS EXCLUSIVE MODE',async()=>{
  const check=await bounded(billingHealth('timeout-admin'));
  console.log('H1_TABLE_LOCK',JSON.stringify({state:check.result.state,elapsedMs:check.elapsedMs}));
  expect(check.result.state).toBe('rejected');
  if(check.result.state==='rejected')expect(check.result.error).toMatchObject({message:'Billing health unavailable',status:503});
  expect(check.elapsedMs).toBeLessThan(2500);
  await assertActorLockReleased();
 });
});
test('slow sequential scans share the remaining statement budget and roll back before returning',async()=>{
 await prisma.$executeRaw`INSERT INTO "BillingOutbox" ("id","payload") VALUES ('slow','{}')`;
 await prisma.$executeRaw`INSERT INTO "BillingProvisioning" ("id","subscriberId","expertProfileId","expectedVersion","tier","price","state") VALUES ('slow','synthetic','synthetic',0,'PREMIUM',10,'UNKNOWN')`;
 // Disposable fixture views force real PostgreSQL statements to execute pg_sleep.
 // Two 3s scans would exceed the total budget if each received a fresh 4.5s timeout.
 await prisma.$executeRawUnsafe('ALTER TABLE "BillingOutbox" RENAME TO "BillingOutbox_timeout_fixture"');
 await prisma.$executeRawUnsafe('ALTER TABLE "BillingProvisioning" RENAME TO "BillingProvisioning_timeout_fixture"');
 let check: Awaited<ReturnType<typeof bounded>> | undefined;
 try {
  await prisma.$executeRawUnsafe('CREATE VIEW "BillingOutbox" AS SELECT b.* FROM "BillingOutbox_timeout_fixture" b CROSS JOIN (SELECT pg_sleep(3)) delay');
  await prisma.$executeRawUnsafe('CREATE VIEW "BillingProvisioning" AS SELECT b.* FROM "BillingProvisioning_timeout_fixture" b CROSS JOIN (SELECT pg_sleep(3)) delay');
  check=await bounded(billingHealth('timeout-admin'));
  console.log('H1_STATEMENT_BUDGET',JSON.stringify({state:check.result.state,elapsedMs:check.elapsedMs}));
  expect(check.result.state).toBe('rejected');
  if(check.result.state==='rejected')expect(check.result.error).toMatchObject({message:'Billing health unavailable',status:503});
  expect(check.elapsedMs).toBeGreaterThan(4000);expect(check.elapsedMs).toBeLessThan(5500);
  await assertActorLockReleased();
  const active=await prisma.$queryRaw<{count:number}[]>`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state='active' AND query LIKE '%FROM "Billing%'`;
  expect(active[0].count).toBe(0);
 } finally {
  // Await cancellation/rollback even when assertions fail, before restoring fixture schema.
  if(check)await check.observed;
  await prisma.$executeRawUnsafe('DROP VIEW IF EXISTS "BillingOutbox"');
  await prisma.$executeRawUnsafe('DROP VIEW IF EXISTS "BillingProvisioning"');
  await prisma.$executeRawUnsafe('ALTER TABLE "BillingOutbox_timeout_fixture" RENAME TO "BillingOutbox"');
  await prisma.$executeRawUnsafe('ALTER TABLE "BillingProvisioning_timeout_fixture" RENAME TO "BillingProvisioning"');
 }
 expect((await billingHealth('timeout-admin')).outbox.ready).toBe(1);
 const settings=await prisma.$queryRaw<{statement:string;lock:string;idle:string}[]>`SELECT current_setting('statement_timeout') AS statement,current_setting('lock_timeout') AS lock,current_setting('idle_in_transaction_session_timeout') AS idle`;
 expect(settings).toEqual([{statement:'0',lock:'0',idle:'0'}]);
});
