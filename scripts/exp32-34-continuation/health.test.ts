import prisma from '@/lib/prisma';
import { billingHealth } from '@/lib/payments/billing-health';
let session: { user: { id: string; role: string } } | null = { user: { id: 'health-admin', role: 'ADMIN' } };
jest.mock('@/lib/auth', () => ({ auth: async () => session }));
import { GET } from '@/app/api/admin/billing/health/route';
const env = { ...process.env };
const now = new Date('2026-10-08T08:00:00Z');
beforeAll(async () => {
 if (process.env.DATABASE_URL !== 'postgresql://billing_continuation@127.0.0.1:55439/billing_continuation') throw Error('Unsafe fixture');
 const rows = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
 if (rows[0].name !== 'billing_continuation') throw Error('Unsafe database');
});
beforeEach(async () => {
 await prisma.$executeRawUnsafe('TRUNCATE "BillingOutbox", "BillingProvisioning", "User" CASCADE');
 await prisma.user.create({ data: { id: 'health-admin', email: 'health@example.invalid', role: 'ADMIN' } });
 process.env.BILLING_REVIEW_ENABLED = 'true';
 session = { user: { id: 'health-admin', role: 'ADMIN' } };
});
afterEach(() => { process.env = { ...env }; });
afterAll(() => prisma.$disconnect());
test('read-only snapshot exposes bounded failures and unresolved work without recipient/body/raw error', async () => {
 for (let i = 0; i < 30; i++) await prisma.$executeRaw`INSERT INTO "BillingOutbox" ("id","payload","state","attempts","lastError") VALUES (${`failed-${String(i).padStart(2,'0')}`}, '{"recipient":"private@example.invalid","body":"private-message"}'::jsonb, 'FAILED', 5, 'provider body secret re_private')`;
 await prisma.$executeRaw`UPDATE "BillingOutbox" SET "lastError"='delivery-ambiguity-review-required' WHERE "id"='failed-00'`;
 await prisma.$executeRaw`INSERT INTO "BillingOutbox" ("id","payload","state","leaseToken","leaseUntil","nextAttemptAt") VALUES ('expired','{}','LEASED','keep-token',${new Date(now.getTime()-1)},${now}),('due','{}','READY',NULL,NULL,${now}),('later','{}','READY',NULL,NULL,${new Date(now.getTime()+1)})`;
 await prisma.$executeRaw`INSERT INTO "BillingProvisioning" ("id","subscriberId","expertProfileId","expectedVersion","tier","price","state") VALUES ('uncertain','private-subscriber','private-expert',0,'PREMIUM',10,'UNKNOWN'),('busy','private-subscriber-2','private-expert-2',0,'PREMIUM',10,'IN_FLIGHT')`;
 const snapshot = await billingHealth('health-admin', now);
 expect(snapshot.attentionRequired).toBe(true);
 expect(snapshot.outbox).toEqual({ready:2,due:1,leased:1,expiredLeases:1,exhaustedReady:0,failed:30});
 expect(snapshot.provisioning).toEqual({unknown:1,inFlight:1});
 expect(snapshot.failures).toHaveLength(25);expect(snapshot.failures[0].code).toBe('delivery-ambiguity-review-required');
 expect(snapshot.failures.slice(1).every(row=>row.code==='review-required')).toBe(true);
 for (const secret of ['private@example.invalid','private-message','provider body','re_private','private-subscriber','keep-token']) expect(JSON.stringify(snapshot)).not.toContain(secret);
 expect(await prisma.$queryRaw`SELECT "id" FROM "BillingOutbox" WHERE "state"='FAILED' AND "attempts"=5`).toHaveLength(30);
 expect(await prisma.$queryRaw`SELECT "leaseToken" FROM "BillingOutbox" WHERE "id"='expired'`).toEqual([{leaseToken:'keep-token'}]);
 expect(await prisma.$queryRaw`SELECT "id" FROM "BillingProvisioning" WHERE "state"='UNKNOWN'`).toHaveLength(1);
});
test.each([{role:'SUBSCRIBER' as const}, {isActive:false}, {isBanned:true}])('persisted admin revocation denies health even with stale session: %j',async data=>{
 await prisma.user.update({where:{id:'health-admin'},data});
 const response=await GET();expect(response.status).toBe(403);expect(response.headers.get('cache-control')).toBe('private, no-store');
 expect(JSON.stringify(await response.json())).not.toContain('failures');
});
test('anonymous denied and empty snapshot is healthy with no-store',async()=>{
 session=null;expect((await GET()).status).toBe(401);
 session={user:{id:'health-admin',role:'ADMIN'}};
 const response=await GET();expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
 expect(await response.json()).toMatchObject({attentionRequired:false,failures:[],unresolved:[]});
});
test('default off and Preview isolation block even stale ADMIN before health reads',async()=>{
 delete process.env.BILLING_REVIEW_ENABLED;expect((await GET()).status).toBe(503);
 process.env.BILLING_REVIEW_ENABLED='true';process.env.VERCEL_ENV='preview';expect((await GET()).status).toBe(503);
});

test('signed charge replay to durable email rejection produces one visible terminal item without losing paid access',async()=>{
 const {createHmac}=await import('crypto');const {NextRequest}=await import('next/server');
 const {POST:webhook}=await import('@/app/api/payments/webhook/route');
 const {runBillingWorker}=await import('@/lib/payments/billing-worker');
 const {billingOutboxStore}=await import('@/lib/payments/billing-store');
 const {billingEmailPreparationStore}=await import('@/lib/payments/billing-email-store');
 const {hasPaidAccess}=await import('@/lib/payments/access');
 await prisma.user.create({data:{id:'health-owner',email:'owner@example.invalid',role:'EXPERT',expertProfile:{create:{id:'health-expert',displayName:'Synthetic',specialty:[],vectorNamespace:'synthetic-health'}}}});
 await prisma.user.create({data:{id:'health-subscriber',email:'subscriber@example.invalid'}});
 await prisma.expertSubscription.create({data:{id:'health-sub',subscriberId:'health-subscriber',expertProfileId:'health-expert',status:'PENDING',tier:'PREMIUM',price:10,razorpaySubscriptionId:'health-provider'}});
 process.env.RAZORPAY_WEBHOOK_SECRET='synthetic-health-webhook';
 const at=Math.floor(Date.now()/1000),raw=JSON.stringify({event:'subscription.charged',created_at:at,payload:{subscription:{entity:{id:'health-provider',current_start:at-1,current_end:at+3600}},payment:{entity:{id:'health-payment',status:'captured'}}}});
 const request=()=>new NextRequest('http://localhost/api/payments/webhook',{method:'POST',body:raw,headers:{'x-razorpay-signature':createHmac('sha256',process.env.RAZORPAY_WEBHOOK_SECRET!).update(raw).digest('hex'),'x-razorpay-event-id':'health-receipt'}});
 const receipts=await Promise.all(Array.from({length:4},()=>webhook(request())));expect(receipts.every(r=>r.status===200)).toBe(true);
 const send=jest.fn(async()=>({error:{name:'invalid_payload',statusCode:422}}));
 const workerEnv={NODE_ENV:'test' as const,BILLING_WORKER_ENABLED:'true',BILLING_EMAIL_DELIVERY_ENABLED:'true',BILLING_WORKER_SECRET:'synthetic-health-worker-secret-never-real',RESEND_API_KEY:'re_synthetic_no_calls',EMAIL_FROM:'Billing <billing@example.invalid>',NEXT_PUBLIC_APP_URL:'https://app.example.invalid'};
 const deps={store:billingOutboxStore,preparation:billingEmailPreparationStore,env:workerEnv,makeTransport:()=>({send})};
 await Promise.all(Array.from({length:4},()=>runBillingWorker(`Bearer ${workerEnv.BILLING_WORKER_SECRET}`,deps)));
 await runBillingWorker(`Bearer ${workerEnv.BILLING_WORKER_SECRET}`,deps);
 expect(send).toHaveBeenCalledTimes(1);
 const health=await billingHealth('health-admin');expect(health.attentionRequired).toBe(true);expect(health.outbox.failed).toBe(1);expect(health.failures[0]).toMatchObject({attempts:1,code:'billing-email-rejected'});
 expect(await prisma.paymentEvent.count()).toBe(1);expect(await prisma.notification.count()).toBe(1);
 expect((await prisma.expertProfile.findUniqueOrThrow({where:{id:'health-expert'}})).totalSubscribers).toBe(1);
 expect(hasPaidAccess(await prisma.expertSubscription.findUniqueOrThrow({where:{id:'health-sub'}}))).toBe(true);
});

// A disabled worker must not hide a crash-exhausted READY row awaiting its next claim.
test('attempt-exhausted ready work requests review before any worker is run',async()=>{
 await prisma.$executeRaw`INSERT INTO "BillingOutbox" ("id","payload","state","attempts") VALUES ('exhausted','{}','READY',5)`;
 const health=await billingHealth('health-admin');
 expect(health.attentionRequired).toBe(true);expect(health.outbox.exhaustedReady).toBe(1);expect(health.outbox.failed).toBe(0);
 expect(await prisma.$queryRaw`SELECT "state","attempts" FROM "BillingOutbox" WHERE "id"='exhausted'`).toEqual([{state:'READY',attempts:5}]);
});
