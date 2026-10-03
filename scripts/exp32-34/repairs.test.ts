import prisma from '../../src/lib/prisma';
import { provisioningStore, beginProvisioning } from '../../src/lib/payments/provisioning-store';
import { billingOutboxStore, enqueueBilling } from '../../src/lib/payments/billing-store';
import { hasSubscriptionAccess } from '../../src/lib/payments/access';
jest.mock('@/lib/auth',()=>({auth:async()=>({user:{id:'visitor',name:'Synthetic'}})}));
jest.mock('@/lib/email/send-notification-email',()=>({sendNotificationEmail:jest.fn(async()=>{})}));
jest.mock('@/lib/razorpay',()=>({getRazorpay:()=>{throw Error('No provider calls permitted');}}));
import { POST as freeRoute } from '../../src/app/api/experts/[expertId]/subscribe/route';
import { NextRequest } from 'next/server';
const free=()=>freeRoute(new NextRequest('http://localhost/api/experts/owner/subscribe',{method:'POST',body:'{"tier":"FREE"}'}),{params:Promise.resolve({expertId:'owner'})});
beforeAll(async()=>{const rows=await prisma.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;if(rows[0].name!=='billing_synthetic')throw Error('Unsafe database');});
beforeEach(async()=>{
 await prisma.$executeRawUnsafe('TRUNCATE "BillingOutbox", "BillingProvisioning", "BillingReconciliation", "PaymentEvent", "User" CASCADE');
 await prisma.user.create({data:{id:'owner',email:'owner@example.invalid',role:'EXPERT',expertProfile:{create:{id:'expert',displayName:'Synthetic',specialty:[],vectorNamespace:'repairs'}}}});
 await prisma.user.create({data:{id:'visitor',email:'visitor@example.invalid'}});
});
afterAll(()=>prisma.$disconnect());
test('persisted provider identity cannot be replaced even when supplied reviewed snapshot omits it',async()=>{
 const intent=await beginProvisioning('visitor','expert','PREMIUM',10);const claimed=await provisioningStore.claim(intent.id,intent.version);const saved=await provisioningStore.save(intent.id,claimed!.version,{providerId:'persisted-provider'});
 await expect(provisioningStore.attach({...saved,providerId:'replacement-provider'})).rejects.toThrow('Provider identity mismatch');
 expect((await prisma.expertSubscription.findFirstOrThrow()).razorpaySubscriptionId).toBeNull();
});
test('expired crash leases exhaust five attempts and become terminal without a sixth delivery',async()=>{
 await prisma.$transaction(tx=>enqueueBilling(tx,'crash',{}));const base=Date.now()+10;
 for(let i=0;i<5;i++)expect(await billingOutboxStore.claim(new Date(base+i*1000),new Date(base+i*1000+500),1)).toHaveLength(1);
 expect(await billingOutboxStore.claim(new Date(base+6000),new Date(base+6500),1)).toHaveLength(0);
 expect(await prisma.$queryRaw`SELECT "id" FROM "BillingOutbox" WHERE "state"='FAILED' AND "attempts"=5`).toHaveLength(1);
});
test('first provisioning rereads a subscription attached while it waits for expert lock',async()=>{
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);let locked!:()=>void;const ready=new Promise<void>(r=>locked=r);
 const blocker=prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT "id" FROM "ExpertProfile" WHERE "id"='expert' FOR UPDATE`;locked();await gate;
  await tx.expertSubscription.create({data:{id:'first-sub',subscriberId:'visitor',expertProfileId:'expert',status:'PENDING',tier:'PREMIUM',price:10,razorpaySubscriptionId:'attached-provider'}});
  await tx.$executeRaw`INSERT INTO "BillingProvisioning" ("id","subscriberId","expertProfileId","subscriptionId","expectedVersion","tier","price","state","providerId") VALUES ('first-intent','visitor','expert','first-sub',0,'PREMIUM',10,'ATTACHED','attached-provider')`;
 },{timeout:10000});
 await ready;const pending=beginProvisioning('visitor','expert','PREMIUM',10);
 try {
  let waiting=false;for(let i=0;i<100;i++){const rows=await prisma.$queryRaw<{n:bigint}[]>`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%ExpertProfile%'`;if(Number(rows[0].n)>0){waiting=true;break;}await new Promise(r=>setTimeout(r,10));}expect(waiting).toBe(true);
 } finally {release();}
 await blocker;expect((await pending).id).toBe('first-intent');expect(await prisma.expertSubscription.count()).toBe(1);
});
test('new free route rollback removes subscription counter and notification intent together',async()=>{
 await prisma.$executeRawUnsafe(`CREATE FUNCTION billing_test_reject_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic notification failure'; END $$`);
 await prisma.$executeRawUnsafe('CREATE TRIGGER billing_test_reject BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION billing_test_reject_notification()');
 try {expect((await free()).status).toBe(500);expect(await prisma.expertSubscription.count()).toBe(0);expect((await prisma.expertProfile.findUniqueOrThrow({where:{id:'expert'}})).totalSubscribers).toBe(0);expect(await prisma.$queryRaw`SELECT "id" FROM "BillingOutbox"`).toHaveLength(0);}
 finally {await prisma.$executeRawUnsafe('DROP TRIGGER billing_test_reject ON "Notification"');await prisma.$executeRawUnsafe('DROP FUNCTION billing_test_reject_notification()');}
});
test('concurrent first free and paid creation preserves one pair and accurate counter',async()=>{
 const results=await Promise.allSettled([free(),beginProvisioning('visitor','expert','PREMIUM',10)]);expect(results.some(r=>r.status==='fulfilled')).toBe(true);
 const rows=await prisma.expertSubscription.findMany();expect(rows).toHaveLength(1);expect((await prisma.expertProfile.findUniqueOrThrow({where:{id:'expert'}})).totalSubscribers).toBe(rows.filter(row=>hasSubscriptionAccess(row)).length);
 if(rows[0].tier==='FREE') {expect(await prisma.notification.count()).toBe(1);expect(await prisma.$queryRaw`SELECT "id" FROM "BillingOutbox"`).toHaveLength(1);}
});
test('native worker checks lease ownership immediately before delivery and never sends expired work',async()=>{
 await prisma.$transaction(tx=>enqueueBilling(tx,'expired-before-start',{}));
 const {drainBillingOutbox}=await import('../../src/lib/payments/outbox');
 const store={...billingOutboxStore,claim:async(...args:Parameters<typeof billingOutboxStore.claim>)=>{
  const rows=await billingOutboxStore.claim(...args);
  for(const row of rows)await prisma.$executeRaw`UPDATE "BillingOutbox" SET "leaseUntil"=${new Date(args[0].getTime()-1)} WHERE "id"=${row.id} AND "leaseToken"=${row.leaseToken}`;
  return rows;
 }};
 const deliver=jest.fn(async()=>{});await drainBillingOutbox(store,deliver);
 expect(deliver).not.toHaveBeenCalled();expect(await prisma.$queryRaw`SELECT "id" FROM "BillingOutbox" WHERE "state"='FAILED' AND "attempts"=5`).toHaveLength(1);
});
test('slow first delivery does not consume the later job lease before it starts',async()=>{
 await prisma.$transaction(async tx=>{await enqueueBilling(tx,'a-first',{});await enqueueBilling(tx,'b-later',{});});
 const {drainBillingOutbox}=await import('../../src/lib/payments/outbox');
 const base=Date.now();let offset=0;const clock=jest.spyOn(Date,'now').mockImplementation(()=>base+offset);
 const claim=jest.fn(billingOutboxStore.claim);const owns=jest.fn(billingOutboxStore.owns);const deliver=jest.fn(async()=>{offset+=61_000;});
 try {await drainBillingOutbox({...billingOutboxStore,claim,owns},deliver,new Date(base+10));expect(deliver).toHaveBeenCalledTimes(2);expect(claim.mock.calls.slice(0,2).every(call=>call[2]===1)).toBe(true);expect(owns.mock.results).toHaveLength(2);}
 finally {clock.mockRestore();}
});
