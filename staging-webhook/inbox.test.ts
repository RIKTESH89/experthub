import {createHmac} from 'node:crypto';
import prisma from '../src/lib/prisma';
import {applyPaymentSnapshot} from '../src/lib/payments/state';
import {receiver,drainOne,credentials,stagingIdentity} from './core';
import {workerHandler} from './worker';
const db={query:async(sql:string,values:unknown[]=[])=>({rows:await prisma.$queryRawUnsafe<any[]>(sql,...values)})};
const secret='synthetic-webhook-secret-32-characters-only';
let time:number;
const body=(event='subscription.charged',offset=0)=>JSON.stringify({event,created_at:time+offset,payload:{subscription:{entity:{id:'synthetic-rzp',current_start:time-60,current_end:time+3600}},payment:{entity:{id:'synthetic-pay',status:'captured'}}}});
const req=(raw:string,header='id-a',signature=createHmac('sha256',secret).update(raw).digest('hex'))=>new Request('http://localhost/',{method:'POST',body:raw,headers:{'x-razorpay-signature':signature,'x-razorpay-event-id':header}});
const inbox=()=>db.query('SELECT * FROM staging_webhook_inbox');
beforeAll(async()=>{const result=await db.query('SELECT current_database() AS name');if(result.rows[0].name!=='webhook_local'||!process.env.DATABASE_URL?.includes('127.0.0.1:55447'))throw new Error('Unsafe test DB');});
beforeEach(async()=>{
 time=Math.floor(Date.now()/1000)-60;
 await prisma.$executeRawUnsafe('TRUNCATE staging_webhook_inbox,"PaymentEvent","BillingOutbox","User" CASCADE');
 await prisma.user.create({data:{id:'owner',email:'owner@example.invalid',role:'EXPERT',expertProfile:{create:{id:'expert',displayName:'Synthetic',specialty:[],vectorNamespace:'synthetic'}}}});
 await prisma.user.create({data:{id:'visitor',email:'visitor@example.invalid'}});
 await prisma.expertSubscription.create({data:{id:'sub',subscriberId:'visitor',expertProfileId:'expert',status:'PENDING',tier:'PREMIUM',price:10,razorpaySubscriptionId:'synthetic-rzp'}});
});
afterAll(()=>prisma.$disconnect());
test('HMAC covers exact bytes; invalid signatures and oversized body never persist',async()=>{
 const receive=receiver(db,secret);expect((await receive(req(body(),'a','0'.repeat(64)))).status).toBe(400);
 expect((await receive(req(body()+' ','a',createHmac('sha256',secret).update(body()).digest('hex')))).status).toBe(400);
 expect((await receive(req('x'.repeat(262145)))).status).toBe(413);expect((await inbox()).rows).toHaveLength(0);
});
test('ack follows persistence; wake failure harmless; altered unsigned header dedupes',async()=>{
 const receive=receiver(db,secret,async()=>{throw new Error('wake failed');});
 expect((await receive(req(body()))).status).toBe(200);expect((await inbox()).rows).toHaveLength(1);
 await Promise.all(Array.from({length:8},(_,i)=>receive(req(body(),`changed-${i}`))));expect((await inbox()).rows).toHaveLength(1);
 expect((await receiver({query:async()=>{throw new Error('commit failed');}},secret)(req(body()))).status).toBe(503);
});
test('same header with changed signed body preserves distinct events and out of order cancellation',async()=>{
 const receive=receiver(db,secret);await receive(req(body('subscription.cancelled',20)));await receive(req(body()));
 await drainOne(db,applyPaymentSnapshot);await drainOne(db,applyPaymentSnapshot);
 expect((await inbox()).rows).toHaveLength(2);expect(await prisma.paymentEvent.count()).toBe(2);
 const sub=await prisma.expertSubscription.findUniqueOrThrow({where:{id:'sub'}});expect(sub.status).toBe('CANCELLED');expect(sub.currentPeriodEnd).toEqual(new Date((time+3600)*1000));
});
test('crash after shared reducer commit replays same receipt without duplicate effects',async()=>{
 await receiver(db,secret)(req(body()));let committed=false;
 await drainOne(db,async s=>{await applyPaymentSnapshot(s);committed=true;throw new Error('crash before ack');});expect(committed).toBe(true);
 await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET next_attempt=now()-interval '1 second'");
 await drainOne(db,applyPaymentSnapshot);expect((await inbox()).rows[0].state).toBe('done');expect(await prisma.paymentEvent.count()).toBe(1);expect(await prisma.notification.count()).toBe(1);expect(await prisma.billingOutbox.count()).toBe(1);
});
test('distinct body serialization repeats no entitlement/counter/notification',async()=>{
 await receiver(db,secret)(req(body()));await receiver(db,secret)(req(body()+' '));
 await drainOne(db,applyPaymentSnapshot);await drainOne(db,applyPaymentSnapshot);
 expect(await prisma.paymentEvent.count()).toBe(2);expect(await prisma.notification.count()).toBe(1);expect(await prisma.billingOutbox.count()).toBe(1);
 expect((await prisma.expertProfile.findUniqueOrThrow({where:{id:'expert'}})).totalSubscribers).toBe(1);
});
test('concurrent workers claim one lease; expired lease recovered; final expired lease dead',async()=>{
 await receiver(db,secret)(req(body()));let calls=0;
 await Promise.all(Array.from({length:6},()=>drainOne(db,async s=>{calls++;await applyPaymentSnapshot(s);})));expect(calls).toBe(1);
 await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET state='leased',lease_token='00000000-0000-0000-0000-000000000001',lease_until=now()-interval '1 second'");
 await drainOne(db,applyPaymentSnapshot);expect((await inbox()).rows[0].state).toBe('done');
 await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET state='leased',attempts=8,lease_token='00000000-0000-0000-0000-000000000001',lease_until=now()-interval '1 second'");
 expect(await drainOne(db,applyPaymentSnapshot)).toBe(false);expect((await inbox()).rows[0].state).toBe('dead');
});
test('signed malformed payload retries durably to max attempts; unauthorized worker cannot drain',async()=>{
 await receiver(db,secret)(req('{'));const handler=workerHandler(db,secret,applyPaymentSnapshot);
 expect((await handler(new Request('http://localhost/',{method:'POST'}))).status).toBe(401);
 for(let i=0;i<3;i++){await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET next_attempt=now()-interval '1 second'");await drainOne(db,applyPaymentSnapshot,3);}
 const row=(await inbox()).rows[0];expect(row.state).toBe('dead');expect(row.attempts).toBe(3);expect(row.last_error).toBe('processing failed');
});
test('identity guards endpoint and overrides pooled/unpooled automatically injected credentials',()=>{
 const env:any=Object.fromEntries(Object.entries(stagingIdentity).map(([k,v])=>[`STAGING_${k.toUpperCase()}_ID`,v]));
 env.WEBHOOK_DATABASE_URL=`postgresql://role:synthetic@${stagingIdentity.endpoint}-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require`;
 env.WEBHOOK_DIRECT_URL=env.WEBHOOK_DATABASE_URL.replace('-pooler','');env.DATABASE_URL='injected-owner';env.DATABASE_URL_UNPOOLED='injected-owner';
 expect(credentials(env).DATABASE_URL_UNPOOLED).toBe(env.WEBHOOK_DIRECT_URL);env.STAGING_BRANCH_ID='production';expect(()=>credentials(env)).toThrow();
});
test('crash before apply retains inbox; retry commits effects once',async()=>{
 await receiver(db,secret)(req(body()));await drainOne(db,async()=>{throw new Error('crash before apply');});
 expect(await prisma.paymentEvent.count()).toBe(0);expect((await inbox()).rows[0].state).toBe('ready');
 await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET next_attempt=now()-interval '1 second'");await drainOne(db,applyPaymentSnapshot);expect(await prisma.paymentEvent.count()).toBe(1);
});
test('expired worker cannot acknowledge or overwrite a replacement lease',async()=>{
 await receiver(db,secret)(req(body()));
 await drainOne(db,async s=>{
  await applyPaymentSnapshot(s);
  await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET lease_until=now()-interval '1 second'");
  await drainOne(db,async()=>{throw new Error('replacement failure');});
 });
 const row=(await inbox()).rows[0];expect(row.state).toBe('ready');expect(row.attempts).toBe(2);expect(row.last_error).toBe('processing failed');expect(await prisma.paymentEvent.count()).toBe(1);
});
test('shared receipt collision with different payload hash rejected without mutations',async()=>{
 const {snapshot}=await import('./snapshot');const input=snapshot(Buffer.from(body()),'a'.repeat(64))!;
 await applyPaymentSnapshot(input);await expect(applyPaymentSnapshot({...input,receipt:{...input.receipt,payloadHash:'b'.repeat(64)}})).rejects.toThrow('Event ID payload mismatch');expect(await prisma.paymentEvent.count()).toBe(1);
});
test('runtime factories default disabled before opening any pool',async()=>{
 const {publicReceiver,privateWorker}=await import('./runtime');const connect=jest.fn();
 expect(()=>publicReceiver(connect,{NODE_ENV:'test'})).toThrow('disabled');await expect(privateWorker(connect,{NODE_ENV:'test'})).rejects.toThrow('disabled');expect(connect).not.toHaveBeenCalled();
});
