import {createHmac} from 'node:crypto';
import {receiverAdapter,workerAdapter,neonWorkerAdapter,wakeContract,receiverPath,workerPath,recoveryPath} from './host';
import {receiver,stagingIdentity} from './core';
const webhookSecret='synthetic-webhook-secret-32-characters-only',workerSecret='different-synthetic-worker-secret-32-chars';
const env=()=>({NODE_ENV:'test',STAGING_WEBHOOK_ENABLED:'true',STAGING_PAYMENT_MODE:'razorpay-test',STAGING_PG_VERSION:'16',STAGING_REGION:'aws-ap-southeast-1',STAGING_PLAN:'Free',STAGING_RAZORPAY_TEST_WEBHOOK_SECRET:webhookSecret,STAGING_WEBHOOK_WORKER_SECRET:workerSecret} as NodeJS.ProcessEnv);
const request=(path:string,method='POST',headers:Record<string,string>={},body?:string)=>new Request(`http://localhost${path}`,{method,headers,body});
const service=(fetch:(request:Request)=>Promise<Response>)=>({fetch,close:async()=>{}});
test('generic adapters route exact paths/methods and stay disabled before initialization',async()=>{
 const init=jest.fn();const r=receiverAdapter({env:{NODE_ENV:'test'},receiver:init}),w=workerAdapter({env:{NODE_ENV:'test'},worker:init});
 expect((await r.fetch(request(receiverPath))).status).toBe(503);expect((await w.fetch(request(workerPath))).status).toBe(503);
 for(const path of ['/',receiverPath+'/',receiverPath+'?relay=1'])expect((await r.fetch(request(path))).status).toBe(404);
 expect((await r.fetch(request(receiverPath,'GET'))).status).toBe(405);expect((await w.fetch(request(workerPath,'GET'))).status).toBe(405);expect(init).not.toHaveBeenCalled();
});
test('public route passes exact raw bytes and invalid signature persists nothing',async()=>{
 const writes:Buffer[]=[];const db={query:async(_sql:string,values:unknown[]=[])=>{writes.push(values[1] as Buffer);return {rows:[]};}};
 const r=receiverAdapter({env:env(),receiver:(_env,wake)=>service(receiver(db,webhookSecret,wake))});
 const raw=' {"event":"synthetic"} \n',headers={'x-razorpay-signature':createHmac('sha256',webhookSecret).update(raw).digest('hex'),'x-razorpay-event-id':'unsigned'};
 expect((await r.fetch(request(receiverPath,'POST',headers,raw))).status).toBe(200);expect(writes[0]).toEqual(Buffer.from(raw));
 expect((await r.fetch(request(receiverPath,'POST',{'x-razorpay-signature':'0'.repeat(64)},raw))).status).toBe(400);expect(writes).toHaveLength(1);
});
test('standalone worker requires bearer auth; genericHTTP never trusts spoofed Neon headers',async()=>{
 const fetch=jest.fn(async()=>new Response(null,{status:200})),init=jest.fn(async()=>service(fetch));
 const w=workerAdapter({env:env(),worker:init});
 expect((await w.fetch(request(workerPath,'POST',{'x-neon-trigger-invocation-id':'spoof'}))).status).toBe(401);expect(init).not.toHaveBeenCalled();
 expect((await w.fetch(request(recoveryPath,'POST',{'x-neon-trigger-invocation-id':'spoof'}))).status).toBe(404);
 expect((await w.fetch(request(workerPath,'POST',{authorization:`Bearer ${workerSecret}`}))).status).toBe(200);expect(fetch).toHaveBeenCalledTimes(1);
});
test('nativeNeon recovery defaultoff; requires pinned trigger envelope and edge header',async()=>{
 const e=env(),fetch=jest.fn(async(r:Request)=>{expect(r.headers.get('authorization')).toBe(`Bearer ${workerSecret}`);expect(new URL(r.url).pathname).toBe(workerPath);return new Response(null,{status:200});});
 const w=neonWorkerAdapter({env:e,worker:async()=>service(fetch)});
 const envelope={version:1,invocation_id:'native-test',trigger:{type:'schedule',id:'approved-local-trigger'},data:{scheduled_at:'2026-10-04T00:30:00Z'}};
 const native=()=>request(recoveryPath,'POST',{'x-neon-trigger-invocation-id':'native-test'},JSON.stringify(envelope));
 expect((await w.fetch(native())).status).toBe(503);e.STAGING_WEBHOOK_RECOVERY_ENABLED='true';e.STAGING_WEBHOOK_RECOVERY_TRIGGER_ID='approved-local-trigger';
 expect((await w.fetch(request(recoveryPath,'POST',{},JSON.stringify(envelope)))).status).toBe(403);
 envelope.trigger.id='wrong';expect((await w.fetch(native())).status).toBe(400);envelope.trigger.id='approved-local-trigger';
 expect((await w.fetch(native())).status).toBe(200);expect(fetch).toHaveBeenCalledTimes(1);
});
test('wake uses pinned path/host, distinct bearer secret, timeout and no redirect; ack survives failure',async()=>{
 const e=env();e.STAGING_WEBHOOK_WAKE_ENABLED='true';e.STAGING_WEBHOOK_WORKER_HOST='verified-worker.example.invalid';e.STAGING_WEBHOOK_WORKER_URL='https://verified-worker.example.invalid/drain';e.STAGING_WEBHOOK_WORKER_BRANCH_ID=stagingIdentity.branch;
 const persist=jest.fn(async()=>({rows:[]})),wake=jest.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{expect(url).toBe(e.STAGING_WEBHOOK_WORKER_URL);expect(init?.redirect).toBe('error');expect(init?.headers).toEqual({authorization:`Bearer ${workerSecret}`});expect(init?.signal).toBeDefined();expect(persist).toHaveBeenCalled();return new Response(null,{status:503});});
 const waitUntil=jest.fn((promise:Promise<unknown>)=>{void promise.catch(()=>{});});const r=receiverAdapter({env:e,fetch:wake as typeof fetch,waitUntil,receiver:(_env,w)=>service(receiver({query:persist},webhookSecret,w))});
 const raw='{}';expect((await r.fetch(request(receiverPath,'POST',{'x-razorpay-signature':createHmac('sha256',webhookSecret).update(raw).digest('hex')},raw))).status).toBe(200);await new Promise(resolve=>setImmediate(resolve));expect(wake).toHaveBeenCalledTimes(1);expect(waitUntil).toHaveBeenCalledTimes(1);
 e.STAGING_WEBHOOK_WORKER_URL='https://different.example.invalid/drain';expect(()=>wakeContract(e)).toThrow();e.STAGING_WEBHOOK_WORKER_URL='https://verified-worker.example.invalid/recover';expect(()=>wakeContract(e)).toThrow();e.STAGING_WEBHOOK_WORKER_URL='https://verified-worker.example.invalid/drain';e.STAGING_WEBHOOK_WORKER_SECRET=webhookSecret;expect(()=>wakeContract(e)).toThrow();
});
