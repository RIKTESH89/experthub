import { changeExistingFree } from "../../src/lib/payments/free-transition";
import prisma from '../../src/lib/prisma';
import { applyPaymentSnapshot, completeCancellation } from '../../src/lib/payments/state';
import { billingOutboxStore, enqueueBilling, reconciliationStore } from '../../src/lib/payments/billing-store';
import { beginProvisioning, provisioningStore } from '../../src/lib/payments/provisioning-store';
import { provision } from '../../src/lib/payments/provisioning';
import { planReconciliation, reconcile } from '../../src/lib/payments/reconciliation';
import { hasPaidAccess } from '../../src/lib/payments/access';
beforeAll(async()=>{const rows=await prisma.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;if(rows[0].name!=='billing_synthetic'||!process.env.DATABASE_URL?.includes('127.0.0.1:55438'))throw Error('Unsafe DB');});
beforeEach(async()=>{
 await prisma.$executeRawUnsafe('TRUNCATE "BillingOutbox", "BillingProvisioning", "BillingReconciliation", "PaymentEvent", "User" CASCADE');
 await prisma.user.create({data:{id:'owner',email:'owner@example.invalid',role:'EXPERT',expertProfile:{create:{id:'expert',displayName:'Synthetic',specialty:[],vectorNamespace:'synthetic-billing'}}}});
 await prisma.user.create({data:{id:'visitor',email:'visitor@example.invalid'}});
 await prisma.expertSubscription.create({data:{id:'sub',subscriberId:'visitor',expertProfileId:'expert',status:'PENDING',tier:'PREMIUM',price:10,razorpaySubscriptionId:'provider'}});
});
afterAll(()=>prisma.$disconnect());
const version=async()=> (await prisma.$queryRaw<{billingVersion:number}[]>`SELECT "billingVersion" FROM "ExpertSubscription" WHERE "id"='sub'`)[0].billingVersion;
const snapshot=()=>({eventType:'subscription.charged',providerSubscriptionId:'provider',occurredAt:new Date(),receipt:{id:'receipt',payloadHash:'hash'},paymentId:'paid',paymentConfirmed:true,currentStart:new Date(Date.now()-1000),currentEnd:new Date(Date.now()+60_000)});
test('six simultaneous receipts atomically commit one version and one durable intent',async()=>{
 const input=snapshot();await Promise.all(Array.from({length:6},()=>applyPaymentSnapshot(input)));
 expect(await version()).toBe(1);expect(await prisma.paymentEvent.count()).toBe(1);
 expect(await prisma.$queryRaw`SELECT "id" FROM "BillingOutbox"`).toHaveLength(1);
 await Promise.all([completeCancellation('sub','visitor','provider'),completeCancellation('sub','visitor','provider')]);
 expect(await version()).toBe(2);const sub=await prisma.expertSubscription.findUniqueOrThrow({where:{id:'sub'}});expect(sub.status).toBe('CANCELLED');expect(hasPaidAccess(sub)).toBe(true);expect(hasPaidAccess(sub,input.currentEnd)).toBe(false);
});
test('transaction rollback removes outbox intent; lease racers are exclusive and stale tokens cannot settle',async()=>{
 await expect(prisma.$transaction(async tx=>{await enqueueBilling(tx,'rollback',{});throw Error('rollback');})).rejects.toThrow();
 expect(await billingOutboxStore.claim(new Date(),new Date(Date.now()+1000),25)).toHaveLength(0);
 await prisma.$transaction(tx=>enqueueBilling(tx,'job',{}));
 const now=new Date(Date.now()+10);const results=await Promise.all(Array.from({length:5},()=>billingOutboxStore.claim(now,new Date(now.getTime()+1000),25)));
 const claims=results.flat();expect(claims).toHaveLength(1);
 const replacement=await billingOutboxStore.claim(new Date(now.getTime()+1001),new Date(now.getTime()+3000),25);expect(replacement).toHaveLength(1);
 expect(await billingOutboxStore.settle('job',claims[0].leaseToken,{state:'DELIVERED'})).toBe(false);
 expect(await billingOutboxStore.settle('job',replacement[0].leaseToken,{state:'DELIVERED'})).toBe(true);
});
test('reviewed reconciliation races apply once and cancellation invalidates reviewed version',async()=>{
 const input=snapshot();const make=async()=>planReconciliation({id:'sub',version:await version(),providerId:'provider',cancelled:false},{providerId:'provider',paymentId:'paid',captured:true,start:input.currentStart,end:input.currentEnd});
 const stale=await make();await completeCancellation('sub','visitor','provider');
 expect((await reconcile(stale,reconciliationStore,{apply:true,reviewedDigest:stale.digest})).outcome).toBe('version-conflict');
 const plan=planReconciliation({id:'sub',version:await version(),providerId:'provider',cancelled:true},stale.evidence);
 const results=await Promise.all(Array.from({length:4},()=>reconcile(plan,reconciliationStore,{apply:true,reviewedDigest:plan.digest})));
 expect(results.filter(r=>r.outcome==='applied')).toHaveLength(1);expect(await version()).toBe(2);
 expect((await prisma.expertSubscription.findUniqueOrThrow({where:{id:'sub'}})).status).toBe('CANCELLED');
});
test('provisioning claim race and sequential retry create exactly one provider subscription',async()=>{
 await prisma.expertSubscription.update({where:{id:'sub'},data:{razorpaySubscriptionId:null}});
 const starts=await Promise.all([beginProvisioning('visitor','expert','PREMIUM',10),beginProvisioning('visitor','expert','PREMIUM',10)]);
 expect(starts[0].id).toBe(starts[1].id);
 const provider={createPlan:jest.fn(async()=> 'plan'),createSubscription:jest.fn(async()=> 'new-provider')};
 await Promise.all(starts.map(intent=>provision(intent,provisioningStore,provider)));
 const retry=await beginProvisioning('visitor','expert','PREMIUM',10);expect((await provision(retry,provisioningStore,provider)).providerId).toBe('new-provider');expect(provider.createSubscription).toHaveBeenCalledTimes(1);expect(await version()).toBe(1);
 expect(hasPaidAccess(await prisma.expertSubscription.findUniqueOrThrow({where:{id:'sub'}}))).toBe(false);
});

test('free transition refuses unresolved provisioning without changing version or provider',async()=>{
 await prisma.expertSubscription.update({where:{id:'sub'},data:{razorpaySubscriptionId:null}});
 await beginProvisioning('visitor','expert','PREMIUM',10);
 await expect(changeExistingFree('sub','visitor','activate')).rejects.toThrow('recovery review');
 expect(await version()).toBe(0);
});
test('free activation racing confirmed paid state never replaces verified paid interval',async()=>{
 await prisma.expertSubscription.update({where:{id:'sub'},data:{status:'CANCELLED',renewalCancelledAt:new Date()}});
 const results=await Promise.allSettled([applyPaymentSnapshot(snapshot()),changeExistingFree('sub','visitor','activate')]);
 const sub=await prisma.expertSubscription.findUniqueOrThrow({where:{id:'sub'}});
 if(sub.tier==='FREE') {expect(sub.razorpaySubscriptionId).toBeNull();expect(results[0].status).toBe('rejected');}
 else {expect(hasPaidAccess(sub)).toBe(true);expect(results[1].status).toBe('rejected');}
 expect(await version()).toBe(1);
});
test('free activation and cancellation each commit one version and accurate counter',async()=>{
 await prisma.expertSubscription.update({where:{id:'sub'},data:{status:'CANCELLED'}});
 await changeExistingFree('sub','visitor','activate');await changeExistingFree('sub','visitor','activate');
 expect(await version()).toBe(1);expect((await prisma.expertProfile.findUniqueOrThrow({where:{id:'expert'}})).totalSubscribers).toBe(1);
 await changeExistingFree('sub','visitor','cancel');expect(await version()).toBe(2);expect((await prisma.expertProfile.findUniqueOrThrow({where:{id:'expert'}})).totalSubscribers).toBe(0);
});
