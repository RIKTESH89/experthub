import {createHmac,createHash} from 'node:crypto';
import prisma from '../src/lib/prisma';
import {applyPaymentSnapshot,applyPaymentSnapshotInTransaction} from '../src/lib/payments/state';
import {receiver,drainOne,credentials,stagingIdentity} from './core';
import {workerHandler} from './worker';
import {database,isolatedClient} from './database';
const db=database(prisma);
const apply=applyPaymentSnapshotInTransaction;
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
 await drainOne(db,apply);await drainOne(db,apply);
 expect((await inbox()).rows).toHaveLength(2);expect(await prisma.paymentEvent.count()).toBe(2);
 const sub=await prisma.expertSubscription.findUniqueOrThrow({where:{id:'sub'}});expect(sub.status).toBe('CANCELLED');expect(sub.currentPeriodEnd).toEqual(new Date((time+3600)*1000));
});
test('crash after reducer before transaction commit rolls back all effects and retries',async()=>{
 await receiver(db,secret)(req(body()));let committed=false;
 await drainOne(db,async (tx,s)=>{await apply(tx,s);committed=true;throw new Error('crash before ack');});expect(committed).toBe(true);expect(await prisma.paymentEvent.count()).toBe(0);
 await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET next_attempt=now()-interval '1 second'");
 await drainOne(db,apply);expect((await inbox()).rows[0].state).toBe('done');expect(await prisma.paymentEvent.count()).toBe(1);expect(await prisma.notification.count()).toBe(1);expect(await prisma.billingOutbox.count()).toBe(1);
});
test('distinct body serialization repeats no entitlement/counter/notification',async()=>{
 await receiver(db,secret)(req(body()));await receiver(db,secret)(req(body()+' '));
 await drainOne(db,apply);await drainOne(db,apply);
 expect(await prisma.paymentEvent.count()).toBe(2);expect(await prisma.notification.count()).toBe(1);expect(await prisma.billingOutbox.count()).toBe(1);
 expect((await prisma.expertProfile.findUniqueOrThrow({where:{id:'expert'}})).totalSubscribers).toBe(1);
});
test('concurrent workers claim one lease; expired lease recovered; final expired lease dead',async()=>{
 await receiver(db,secret)(req(body()));let calls=0;
 await Promise.all(Array.from({length:6},()=>drainOne(db,async (tx,s)=>{calls++;await apply(tx,s);})));expect(calls).toBe(1);
 await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET state='leased',lease_token='00000000-0000-0000-0000-000000000001',lease_until=now()-interval '1 second'");
 await drainOne(db,apply);expect((await inbox()).rows[0].state).toBe('done');
 await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET state='leased',attempts=8,lease_token='00000000-0000-0000-0000-000000000001',lease_until=now()-interval '1 second'");
 expect(await drainOne(db,apply)).toBe(false);expect((await inbox()).rows[0].state).toBe('dead');
});
test('signed malformed payload retries durably to max attempts; unauthorized worker cannot drain',async()=>{
 await receiver(db,secret)(req('{'));const handler=workerHandler(db,secret,apply);
 expect((await handler(new Request('http://localhost/',{method:'POST'}))).status).toBe(401);
 for(let i=0;i<3;i++){await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET next_attempt=now()-interval '1 second'");await drainOne(db,apply,3);}
 const row=(await inbox()).rows[0];expect(row.state).toBe('dead');expect(row.attempts).toBe(3);expect(row.last_error).toBe('processing failed');
});
test('identity guards endpoint and overrides pooled/unpooled automatically injected credentials',()=>{
 const env:any=Object.fromEntries(Object.entries(stagingIdentity).map(([k,v])=>[`STAGING_${k.toUpperCase()}_ID`,v]));
 env.WEBHOOK_DATABASE_URL=`postgresql://staging_webhook_worker:synthetic@${stagingIdentity.endpoint}-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`;
 env.WEBHOOK_DIRECT_URL=env.WEBHOOK_DATABASE_URL.replace('-pooler','');env.DATABASE_URL='injected-owner';env.DATABASE_URL_UNPOOLED='injected-owner';
 expect(credentials(env).DATABASE_URL_UNPOOLED).toBe(env.WEBHOOK_DIRECT_URL);env.STAGING_BRANCH_ID='production';expect(()=>credentials(env)).toThrow();
});
test('crash before apply retains inbox; retry commits effects once',async()=>{
 await receiver(db,secret)(req(body()));await drainOne(db,async()=>{throw new Error('crash before apply');});
 expect(await prisma.paymentEvent.count()).toBe(0);expect((await inbox()).rows[0].state).toBe('ready');
 await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET next_attempt=now()-interval '1 second'");await drainOne(db,apply);expect(await prisma.paymentEvent.count()).toBe(1);
});
test('expiry during apply rolls back receipt and all effects atomically',async()=>{
 await receiver(db,secret)(req(body()));
 await drainOne(db,async (tx,s)=>{
  await apply(tx,s);
  await tx.$executeRawUnsafe("UPDATE staging_webhook_inbox SET lease_until=clock_timestamp()-interval '1 second'");
 });
 expect(await prisma.paymentEvent.count()).toBe(0);expect(await prisma.notification.count()).toBe(0);expect(await prisma.billingOutbox.count()).toBe(0);
 expect((await prisma.expertSubscription.findUniqueOrThrow({where:{id:'sub'}})).status).toBe('PENDING');
});
test('shared receipt collision with different payload hash rejected without mutations',async()=>{
 const {snapshot}=await import('./snapshot');const input=snapshot(Buffer.from(body()),'a'.repeat(64))!;
 await applyPaymentSnapshot(input);await expect(applyPaymentSnapshot({...input,receipt:{...input.receipt,payloadHash:'b'.repeat(64)}})).rejects.toThrow('Event ID payload mismatch');expect(await prisma.paymentEvent.count()).toBe(1);
});
test('runtime factories default disabled before opening any pool',async()=>{
 const {publicReceiver,privateWorker}=await import('./runtime');expect(()=>publicReceiver({NODE_ENV:'test'})).toThrow('disabled');await expect(privateWorker({NODE_ENV:'test'})).rejects.toThrow('disabled');
});
test('different serialization increments billingVersion and invalidates earlier review CAS',async()=>{
 const {reconciliationStore}=await import('../src/lib/payments/billing-store');const {planReconciliation}=await import('../src/lib/payments/reconciliation');
 await receiver(db,secret)(req(body()));await drainOne(db,apply);
 const first=await prisma.expertSubscription.findUniqueOrThrow({where:{id:'sub'}});
 const plan=planReconciliation({id:first.id,version:first.billingVersion,providerId:'synthetic-rzp',cancelled:false},{providerId:'synthetic-rzp',paymentId:'synthetic-pay',captured:true,start:new Date((time-60)*1000),end:new Date((time+3600)*1000)});
 await receiver(db,secret)(req(body()+' '));await drainOne(db,apply);
 const after=await prisma.expertSubscription.findUniqueOrThrow({where:{id:'sub'}});expect(after.billingVersion).toBe(first.billingVersion+1);
 expect(await prisma.expertSubscription.count({where:{id:'sub',billingVersion:plan.row.version}})).toBe(0);
 expect(await reconciliationStore.apply(plan)).toBe(false);expect(await prisma.billingReconciliation.count()).toBe(0);
});
test('independent repaired: final expired lease deadletter cannot commit first business effects',async()=>{
 await receiver(db,secret)(req(body()));
 const wrapped={...db,query:async(sql:string,values:unknown[]=[],operation?:import('./core').Operation)=>{
  const result=await db.query(sql,values,operation);
  if(sql.includes('RETURNING i.*')&&result.rows.length){await prisma.$executeRawUnsafe("UPDATE staging_webhook_inbox SET lease_until=clock_timestamp()-interval '1 second',attempts=8");await drainOne(db,apply);}
  return result;
 }};
 await drainOne(wrapped,apply);expect((await inbox()).rows[0].state).toBe('dead');expect(await prisma.paymentEvent.count()).toBe(0);
});
test('independent repaired: exact routing rejects lookalikes wrong database role port TLS and options',()=>{
 const env:any=Object.fromEntries(Object.entries(stagingIdentity).map(([k,v])=>[`STAGING_${k.toUpperCase()}_ID`,v]));
 const valid=`postgresql://staging_webhook_worker:synthetic@${stagingIdentity.endpoint}-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`;
 env.WEBHOOK_DATABASE_URL=valid;env.WEBHOOK_DIRECT_URL=valid.replace('-pooler','');expect(credentials(env).DATABASE_URL).toBe(valid);
 for(const bad of [valid.replace('.c-4.','.unrelated.'),valid.replace('/neondb','/other'),valid.replace('staging_webhook_worker','neondb_owner'),valid.replace('/neondb',':5433/neondb'),valid.replace('require','disable'),valid+'&options=-csearch_path%3Devil',valid+'&sslmode=require',valid.replace(':synthetic',''),valid+'#ignored',valid.replace('.neon.tech','.neon.tech.evil')]){env.WEBHOOK_DATABASE_URL=bad;expect(()=>credentials(env)).toThrow();}
 env.WEBHOOK_DATABASE_URL=valid;env.WEBHOOK_DIRECT_URL=valid;expect(()=>credentials(env)).toThrow();
});
test('independent repaired: invalid header and already aborted request never open reader',async()=>{
 const getReader=jest.fn(()=>({read:jest.fn(()=>new Promise<never>(()=>{})),cancel:jest.fn()}));
 for(const headers of [new Headers(),new Headers({'x-razorpay-signature':'a'.repeat(64)})]){
  const r={method:'POST',headers,signal:AbortSignal.abort(),body:{getReader}} as unknown as Request;
  expect([400,408]).toContain((await receiver(db,secret)(r)).status);
 }expect(getReader).not.toHaveBeenCalled();
});
test('slow body and hanging cancel are bounded; stream errors cannot persist',async()=>{
 const slow={method:'POST',headers:new Headers({'x-razorpay-signature':'a'.repeat(64)}),signal:new AbortController().signal,body:{getReader:()=>({read:()=>new Promise<never>(()=>{}),cancel:()=>new Promise<never>(()=>{})})}} as unknown as Request;
 expect((await receiver(db,secret,async()=>{},20)(slow)).status).toBe(408);
 const broken=new Request('http://localhost/',{method:'POST',headers:{'x-razorpay-signature':'a'.repeat(64)},body:new ReadableStream({pull(){throw new Error('stream error');}}),duplex:'half'} as RequestInit);
 expect((await receiver(db,secret)(broken)).status).toBe(400);expect((await inbox()).rows).toHaveLength(0);
});
test('independent repaired: stalled apply returns bounded503 and delayed transaction writes cannot commit',async()=>{
 await receiver(db,secret)(req(body()));let late:(()=>Promise<unknown>)|undefined;
 const handle=workerHandler(db,secret,async (tx,s)=>{late=()=>apply(tx,s);await new Promise<never>(()=>{});},60);
 const started=Date.now();expect((await handle(new Request('http://localhost/',{method:'POST',headers:{authorization:`Bearer ${secret}`}}))).status).toBe(503);expect(Date.now()-started).toBeLessThan(1000);
 await expect(late!()).rejects.toThrow();expect(await prisma.paymentEvent.count()).toBe(0);expect(await prisma.notification.count()).toBe(0);
});
test('database stall canceled at statement deadline before any payment effects',async()=>{
 await receiver(db,secret)(req(body()));
 const handle=workerHandler(db,secret,async(tx,s)=>{await tx.$queryRawUnsafe('SELECT pg_sleep(2)');await apply(tx,s);},60);
 expect((await handle(new Request('http://localhost/',{method:'POST',headers:{authorization:`Bearer ${secret}`}}))).status).toBe(503);expect(await prisma.paymentEvent.count()).toBe(0);
});
test('lost response after atomic commit and exact replay retain one receipt/effect',async()=>{
 await receiver(db,secret)(req(body()));let first=true;
 const wrapped={...db,transaction:async <T>(operation:import('./core').Operation,action:(tx:import('./core').Transaction)=>Promise<T>)=>{const value=await db.transaction(operation,action);if(first){first=false;throw new Error('lost reply after commit');}return value;}};
 await drainOne(wrapped,apply);expect((await inbox()).rows[0].state).toBe('done');
 await receiver(db,secret)(req(body(),'another-header'));expect(await drainOne(db,apply)).toBe(false);expect(await prisma.paymentEvent.count()).toBe(1);expect(await prisma.notification.count()).toBe(1);
});
test('inbox→subscription→expert contention skips locked inbox and commits once without deadlock',async()=>{
 await receiver(db,secret)(req(body()));let entered!:()=>void,release!:()=>void;
 const ready=new Promise<void>(r=>{entered=r;});const gate=new Promise<void>(r=>{release=r;});
 const first=drainOne(db,async(tx,s)=>{entered();await gate;return apply(tx,s);});await ready;
 const contender=await drainOne(db,apply);expect(contender).toBe(false);release();await first;expect(await prisma.paymentEvent.count()).toBe(1);
});
test('disposable local restricted roles permit receiver insert and worker reducer, deny unrelated writes',async()=>{
 const {PrismaClient}=await import('@prisma/client');
 await prisma.$executeRawUnsafe('CREATE ROLE synthetic_webhook_receiver LOGIN');
 await prisma.$executeRawUnsafe('CREATE ROLE synthetic_webhook_worker LOGIN');
 await prisma.$executeRawUnsafe('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
 await prisma.$executeRawUnsafe('REVOKE TEMPORARY ON DATABASE webhook_local FROM PUBLIC');
 await prisma.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO synthetic_webhook_receiver,synthetic_webhook_worker');
 await prisma.$executeRawUnsafe('GRANT INSERT(digest,raw_body),SELECT(digest) ON staging_webhook_inbox TO synthetic_webhook_receiver');
 await prisma.$executeRawUnsafe('GRANT SELECT,UPDATE ON staging_webhook_inbox TO synthetic_webhook_worker');
 await prisma.$executeRawUnsafe('GRANT SELECT,UPDATE ON "ExpertSubscription","ExpertProfile" TO synthetic_webhook_worker');
 await prisma.$executeRawUnsafe('GRANT SELECT ON "User" TO synthetic_webhook_worker');
 await prisma.$executeRawUnsafe('GRANT SELECT,INSERT ON "PaymentEvent","Notification" TO synthetic_webhook_worker');
 await prisma.$executeRawUnsafe('GRANT INSERT,SELECT(id) ON "BillingOutbox" TO synthetic_webhook_worker');
 const client=(role:string)=>isolatedClient(`postgresql://${role}@127.0.0.1:55447/webhook_local`);
 const r=client('synthetic_webhook_receiver'),w=client('synthetic_webhook_worker');
 try{
  expect((await receiver(database(r),secret)(req(body()))).status).toBe(200);
  expect((await receiver(database(r),secret)(req(body(),'changed'))).status).toBe(200);
  await expect(r.$queryRawUnsafe('SELECT * FROM "User"')).rejects.toThrow();
  await expect(r.$executeRawUnsafe("UPDATE staging_webhook_inbox SET state='dead'")).rejects.toThrow();
  await drainOne(database(w),apply);expect(await prisma.paymentEvent.count()).toBe(1);expect((await inbox()).rows[0].state).toBe('done');
  for(const sql of ['DELETE FROM staging_webhook_inbox','DELETE FROM "User"','CREATE TABLE public.synthetic_forbidden(id int)','CREATE TEMP TABLE synthetic_forbidden(id int)','CREATE ROLE synthetic_forbidden','UPDATE "User" SET name=\'forbidden\''])await expect(w.$executeRawUnsafe(sql)).rejects.toThrow();
  const attrs=await w.$queryRawUnsafe<any[]>("SELECT rolsuper,rolcreaterole,rolcreatedb,rolbypassrls FROM pg_roles WHERE rolname=current_user");expect(attrs[0]).toEqual({rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolbypassrls:false});
 }finally{await r.$disconnect();await w.$disconnect();}
});
test('replaced token fences old owner before any domain effects',async()=>{
 await receiver(db,secret)(req(body()));
 const replacement='00000000-0000-0000-0000-000000000002';
 const wrapped={...db,query:async(sql:string,values:unknown[]=[],operation?:import('./core').Operation)=>{const result=await db.query(sql,values,operation);if(sql.includes('RETURNING i.*')&&result.rows.length)await prisma.$executeRawUnsafe('UPDATE staging_webhook_inbox SET lease_token=$1::uuid',replacement);return result;}};
 await drainOne(wrapped,apply);expect(await prisma.paymentEvent.count()).toBe(0);expect((await inbox()).rows[0].lease_token).toBe(replacement);
});
test('abort during body read cancels without persistence',async()=>{
 const controller=new AbortController();let canceled=false;
 const request={method:'POST',headers:new Headers({'x-razorpay-signature':'a'.repeat(64)}),signal:controller.signal,body:{getReader:()=>({read:()=>new Promise<never>(()=>{}),cancel:async()=>{canceled=true;}})}} as unknown as Request;
 const pending=receiver(db,secret)(request);controller.abort();expect((await pending).status).toBe(408);expect(canceled).toBe(true);expect((await inbox()).rows).toHaveLength(0);
});
test('abort during worker apply rolls back and closes late transaction capability',async()=>{
 await receiver(db,secret)(req(body()));let enter!:()=>void,late!:()=>Promise<unknown>;const entered=new Promise<void>(r=>{enter=r;});const controller=new AbortController();
 const handle=workerHandler(db,secret,async(tx,s)=>{late=()=>apply(tx,s);enter();await new Promise<never>(()=>{});});
 const pending=handle(new Request('http://localhost/',{method:'POST',signal:controller.signal,headers:{authorization:`Bearer ${secret}`}}));await entered;controller.abort();expect((await pending).status).toBe(503);await expect(late()).rejects.toThrow();expect(await prisma.paymentEvent.count()).toBe(0);
});
test('claim database stall honors deadline without leaving mutations running',async()=>{
 await receiver(db,secret)(req(body()));
 const stalled={...db,query:async(sql:string,values:unknown[]=[],operation?:import('./core').Operation)=>{if(sql.includes('RETURNING i.*'))return db.transaction(operation!,async tx=>{await tx.raw.$queryRawUnsafe('SELECT pg_sleep(2)');return tx.query(sql,values);});return db.query(sql,values,operation);}};
 const handle=workerHandler(stalled,secret,apply,60);expect((await handle(new Request('http://localhost/',{method:'POST',headers:{authorization:`Bearer ${secret}`}}))).status).toBe(503);expect((await inbox()).rows[0].state).toBe('ready');expect(await prisma.paymentEvent.count()).toBe(0);
});
