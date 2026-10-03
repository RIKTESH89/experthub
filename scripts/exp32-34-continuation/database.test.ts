import prisma from '../../src/lib/prisma';
import { billingOutboxStore, enqueueBilling, reviewedReconciliationStore } from '../../src/lib/payments/billing-store';
import { billingEmailPreparationStore } from '../../src/lib/payments/billing-email-store';
import { runBillingWorker } from '../../src/lib/payments/billing-worker';
import { reviewedProvisioningStore, beginProvisioning, provisioningStore } from '../../src/lib/payments/provisioning-store';
import { reviewBilling, type BillingReviewDependencies } from '../../src/lib/payments/billing-review';
import { type RecoveryIntent } from '../../src/lib/payments/provider-lookup';
import { planReconciliation } from '../../src/lib/payments/reconciliation';
import { NextRequest } from 'next/server';
const env:NodeJS.ProcessEnv={NODE_ENV:'test',BILLING_WORKER_ENABLED:'true',BILLING_EMAIL_DELIVERY_ENABLED:'true',BILLING_REVIEW_ENABLED:'true',BILLING_WORKER_SECRET:'synthetic-worker-not-real-credentials',BILLING_REVIEW_SECRET:'synthetic-review-signing-not-real-credentials',RESEND_API_KEY:'re_synthetic_no_calls',EMAIL_FROM:'Synthetic <billing@example.invalid>',NEXT_PUBLIC_APP_URL:'https://app.example.invalid'};
const authorization=`Bearer ${env.BILLING_WORKER_SECRET}`;
let session:{user:{id:string;role:string}}|null={user:{id:'admin',role:'ADMIN'}};
jest.mock('@/lib/auth',()=>({auth:async()=>session}));
import { POST as workerRoute } from '../../src/app/api/internal/billing/worker/route';
import { POST as reviewRoute } from '../../src/app/api/admin/billing/review/route';
beforeAll(async()=>{if(!process.env.DATABASE_URL?.includes('127.0.0.1:55439'))throw Error('Unsafe URL');const rows=await prisma.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;if(rows[0].name!=='billing_continuation')throw Error('Unsafe DB');});
beforeEach(async()=>{
 await prisma.$executeRawUnsafe('TRUNCATE "BillingOutbox", "BillingProvisioning", "BillingReconciliation", "PaymentEvent", "User" CASCADE');
 await prisma.user.create({data:{id:'owner',email:'owner@example.invalid',role:'EXPERT',name:'Owner',expertProfile:{create:{id:'expert',displayName:'Synthetic',specialty:[],vectorNamespace:'billing-continuation'}}}});
 await prisma.user.create({data:{id:'visitor',email:'visitor@example.invalid'}});await prisma.user.create({data:{id:'admin',email:'admin@example.invalid',role:'ADMIN'}});
 session={user:{id:'admin',role:'ADMIN'}};
});
afterAll(()=>prisma.$disconnect());
const enqueue=()=>prisma.$transaction(tx=>enqueueBilling(tx,'notification',{type:'new_subscriber',recipientUserId:'owner',subscriberName:'Synthetic <name>'}));
const row=async()=> (await prisma.$queryRaw<{state:string;attempts:number;payload:any;lastError:string|null}[]>`SELECT * FROM "BillingOutbox" WHERE "id"='notification'`)[0];
test('overlapping workers and ack lost delivery reuse durable content and provider key',async()=>{
 await enqueue();let accept=0;let attempts=0;const accepted=new Map<string,string>();const send=jest.fn(async(_message,options)=>{attempts++;if(!accepted.has(options.idempotencyKey)){accepted.set(options.idempotencyKey,'accepted-id');accept++;throw Error('remote accepted then timeout');}return {data:{id:'accepted-id'}};});
 const base=new Date();const deps={store:billingOutboxStore,preparation:billingEmailPreparationStore,env,makeTransport:()=>({send}),now:()=>base};
 await Promise.all(Array.from({length:6},()=>runBillingWorker(authorization,deps)));
 expect(attempts).toBe(1);expect((await row()).state).toBe('READY');expect((await row()).payload._billingEmail.message.html).toContain('&lt;name&gt;');
 await prisma.$executeRaw`UPDATE "BillingOutbox" SET "payload"=jsonb_set("payload",'{subscriberName}','"Changed subscriber"') WHERE "id"='notification'`;
 await runBillingWorker(authorization,{...deps,now:()=>new Date(base.getTime()+10000)});
 expect(attempts).toBe(2);expect(accept).toBe(1);expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);expect((await row()).state).toBe('DELIVERED');
});
test('transient provider rejections exhaust durable five-attempt policy',async()=>{
 await enqueue();const base=Date.now();const send=jest.fn(async()=>({error:{name:'rate_limit_exceeded',statusCode:429}}));
 for(let i=0;i<7;i++)await runBillingWorker(authorization,{store:billingOutboxStore,preparation:billingEmailPreparationStore,env,makeTransport:()=>({send}),now:()=>new Date(base+i*100000)});
 expect(send).toHaveBeenCalledTimes(5);expect((await row()).state).toBe('FAILED');expect((await row()).attempts).toBe(5);
});
test('ambiguous delivery older than retention cutoff fails closed without another send',async()=>{
 await enqueue();const base=new Date(),send=jest.fn(async()=>{throw Error('ack lost');}),deps={store:billingOutboxStore,preparation:billingEmailPreparationStore,env,makeTransport:()=>({send})};
 await runBillingWorker(authorization,{...deps,now:()=>base});await runBillingWorker(authorization,{...deps,now:()=>new Date(base.getTime()+23*3600000)});
 expect(send).toHaveBeenCalledTimes(1);expect((await row()).state).toBe('FAILED');expect((await row()).lastError).toBe('delivery-ambiguity-review-required');
});
test('recipient opt-out and changed address stop queued emails',async()=>{
 await enqueue();await prisma.userSettings.create({data:{userId:'owner',emailOnNewSubscriber:false}});
 const send=jest.fn(async()=>({data:{id:'no-send'}}));await runBillingWorker(authorization,{store:billingOutboxStore,preparation:billingEmailPreparationStore,env,makeTransport:()=>({send})});expect(send).not.toHaveBeenCalled();expect((await row()).state).toBe('DELIVERED');
});
function reviewDeps():BillingReviewDependencies {
 return {env,actor:async()=>{const user=await prisma.user.findUnique({where:{id:'admin'}});return user?.isActive&&!user.isBanned?{id:user.id,role:user.role}:null;},loadRow:async()=>({id:'sub',version:0,providerId:'remote',cancelled:false}),loadIntent:async id=>(await prisma.$queryRaw<RecoveryIntent[]>`SELECT * FROM "BillingProvisioning" WHERE "id"=${id}`)[0],lookup:{paidPeriod:async()=>({providerId:'remote',paymentId:'payment',captured:true,start:new Date(Date.now()-1000),end:new Date(Date.now()+60000)}),recover:async intent=>({outcome:'candidate',evidence:{intentId:intent.id,providerId:'remote'}})},reconciliation:reviewedReconciliationStore,provisioning:reviewedProvisioningStore};
}
test('reviewed reconciliation commit records actor and digest; concurrent or stale input cannot apply',async()=>{
 await prisma.expertSubscription.create({data:{id:'sub',subscriberId:'visitor',expertProfileId:'expert',tier:'PREMIUM',price:10,status:'PENDING',razorpaySubscriptionId:'remote'}});
 const deps=reviewDeps(),proposal=await reviewBilling({action:'plan',kind:'reconcile',id:'sub',paymentId:'payment'},env.NEXT_PUBLIC_APP_URL!,deps) as any;
 const input={action:'apply',token:proposal.token,reviewedDigest:proposal.reviewedDigest};
 const results=await Promise.all(Array.from({length:4},()=>reviewBilling(input,env.NEXT_PUBLIC_APP_URL!,deps)));expect(results.filter(r=>r.outcome==='applied')).toHaveLength(1);
 const audit=(await prisma.$queryRaw<{evidence:any}[]>`SELECT "evidence" FROM "BillingReconciliation"`)[0];expect(audit.evidence.review.actorId).toBe('admin');expect(audit.evidence.review.digest).toBe(proposal.reviewedDigest);expect(audit.evidence.review.planDigest).toBe(proposal.proposal.plan.digest);
 expect((await reviewBilling(input,env.NEXT_PUBLIC_APP_URL!,deps)).outcome).toBe('version-conflict');
});
test('reviewed recovery commit audits identity; revoked persisted ADMIN cannot apply even with valid prior token',async()=>{
 const start=await beginProvisioning('visitor','expert','PREMIUM',10);const claimed=await provisioningStore.claim(start.id,start.version);await provisioningStore.save(start.id,claimed!.version,{state:'UNKNOWN'});
 const deps=reviewDeps(),proposal=await reviewBilling({action:'plan',kind:'recover',id:start.id},env.NEXT_PUBLIC_APP_URL!,deps) as any;
 await prisma.user.update({where:{id:'admin'},data:{role:'SUBSCRIBER'}});
 await expect(reviewedProvisioningStore('admin',proposal.reviewedDigest).attach({...proposal.proposal.intent,providerId:'remote'})).rejects.toThrow('Active administrator');
 await prisma.user.update({where:{id:'admin'},data:{role:'ADMIN'}});await reviewBilling({action:'apply',token:proposal.token,reviewedDigest:proposal.reviewedDigest},env.NEXT_PUBLIC_APP_URL!,deps);
 const audit=(await prisma.$queryRaw<{payload:any}[]>`SELECT "payload" FROM "BillingOutbox" WHERE "payload"->>'type'='billing_review_audit'`)[0];expect(audit.payload.actorId).toBe('admin');expect(audit.payload.reviewedDigest).toBe(proposal.reviewedDigest);
});
test('reconciliation apply repeats persisted role active and ban checks inside transaction',async()=>{
 await prisma.expertSubscription.create({data:{id:'sub',subscriberId:'visitor',expertProfileId:'expert',tier:'PREMIUM',price:10,status:'PENDING',razorpaySubscriptionId:'remote'}});
 const plan=planReconciliation({id:'sub',version:0,providerId:'remote',cancelled:false},{providerId:'remote',paymentId:'payment',captured:true,start:new Date(1000),end:new Date(2000)});
 for(const data of [{isActive:false,isBanned:false},{isActive:true,isBanned:true}]){await prisma.user.update({where:{id:'admin'},data});await expect(reviewedReconciliationStore('admin').apply(plan)).rejects.toThrow('Active administrator');}
 expect(await prisma.$queryRaw`SELECT "id" FROM "BillingReconciliation"`).toHaveLength(0);
});
test('HTTP review rejects stale session ADMIN persisted as subscriber before lookup',async()=>{
 const saved={...process.env};try {
  Object.assign(process.env,env);await prisma.user.update({where:{id:'admin'},data:{role:'SUBSCRIBER'}});
  const response=await reviewRoute(new NextRequest('https://app.example.invalid/api/admin/billing/review',{method:'POST',headers:{origin:'https://app.example.invalid'},body:JSON.stringify({action:'plan',kind:'recover',id:'anything'})}));expect(response.status).toBe(403);
 }finally{for(const key of Object.keys(env))if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
});
test('HTTP routes are default disabled and Preview blocked even when all billing flags are set',async()=>{
 const request=new NextRequest('http://localhost/api/internal/billing/worker',{method:'POST'});expect((await workerRoute(request)).status).toBe(503);
 expect((await reviewRoute(new NextRequest('http://localhost/api/admin/billing/review',{method:'POST',body:'{}'}))).status).toBe(503);
 const saved={...process.env};try {Object.assign(process.env,env,{VERCEL_ENV:'preview'});expect((await workerRoute(new NextRequest('http://localhost/api/internal/billing/worker',{method:'POST',headers:{authorization}}))).status).toBe(503);expect((await reviewRoute(new NextRequest('http://localhost/api/admin/billing/review',{method:'POST',headers:{origin:env.NEXT_PUBLIC_APP_URL!},body:'{}'}))).status).toBe(503);}finally {for(const key of [...Object.keys(env),'VERCEL_ENV'])if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
 expect(await prisma.$queryRaw`SELECT "id" FROM "BillingOutbox"`).toHaveLength(0);
});
test('lease lost during durable email preparation prevents the provider call',async()=>{
 await enqueue();const prepare=async(...args:Parameters<typeof billingEmailPreparationStore.prepare>)=>{const prepared=await billingEmailPreparationStore.prepare(...args);await prisma.$executeRaw`UPDATE "BillingOutbox" SET "leaseUntil"=${new Date(0)} WHERE "id"=${args[0]}`;return prepared;};
 const send=jest.fn(async()=>({data:{id:'must-not-send'}}));
 await runBillingWorker(authorization,{store:billingOutboxStore,preparation:{...billingEmailPreparationStore,prepare},env,makeTransport:()=>({send})});expect(send).not.toHaveBeenCalled();
});
test('HTTP worker rejects incorrect dedicated credential without consuming a queue attempt',async()=>{
 await enqueue();const saved={...process.env};try {
  Object.assign(process.env,env);session=null;
  const response=await workerRoute(new NextRequest('https://app.example.invalid/api/internal/billing/worker',{method:'POST',headers:{authorization:'Bearer not-authorized'}}));expect(response.status).toBe(401);expect((await row()).attempts).toBe(0);
 }finally {for(const key of Object.keys(env))if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
});
test('worker handler method path and unauthenticated access variants fail before claiming',async()=>{
 await enqueue();const saved={...process.env};try {
  Object.assign(process.env,env);session=null;
  const request=(path:string,method='POST',credential?:string)=>new NextRequest(`https://app.example.invalid${path}`,{method,headers:credential?{authorization:credential}:{}});
  for(const method of ['GET','PUT','PATCH','DELETE','HEAD','OPTIONS'])expect((await workerRoute(request('/api/internal/billing/worker',method,authorization))).status).toBe(405);
  for(const path of ['/api/internal/billing/worker/','/api/internal/billing/workers','/api/internal/billing/%77orker','/api/internal/billing/worker%2F','/api/internal/billing/other'])expect((await workerRoute(request(path,'POST',authorization))).status).toBe(404);
  expect((await workerRoute(request('/api/internal/billing/worker'))).status).toBe(401);
  expect((await row()).attempts).toBe(0);
  // Scheduler needs no user session, but does need its purpose-specific credential.
  await prisma.$executeRaw`DELETE FROM "BillingOutbox" WHERE "id"='notification'`;
  const valid=await workerRoute(request('/api/internal/billing/worker','POST',authorization));expect(valid.status).toBe(200);expect(await valid.json()).toEqual({processed:0});
 }finally {for(const key of Object.keys(env))if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
});
