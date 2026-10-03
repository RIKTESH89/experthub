import { createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { PaymentSnapshot } from '../src/lib/payments/state';
export type Operation={deadline:number;signal:AbortSignal};
export interface Database { query(sql:string,values?:unknown[],operation?:Operation):Promise<{rows:any[]}> }
export interface Transaction extends Database {raw:Prisma.TransactionClient}
export interface WorkerDatabase extends Database {transaction<T>(operation:Operation,action:(tx:Transaction)=>Promise<T>):Promise<T>}
export type Apply=(tx:Prisma.TransactionClient,input:PaymentSnapshot)=>Promise<unknown>;
export const stagingIdentity = { project:'steep-wildflower-10013234', branch:'br-steep-pond-b3xfo61k', endpoint:'ep-quiet-bread-b3rqji3g' } as const;
export const stagingHosts={direct:'ep-quiet-bread-b3rqji3g.c-4.ap-southeast-1.aws.neon.tech',pooled:'ep-quiet-bread-b3rqji3g-pooler.c-4.ap-southeast-1.aws.neon.tech'};
export function credentials(env:NodeJS.ProcessEnv,role='staging_webhook_worker') {
 for(const [key,value] of Object.entries(stagingIdentity))if(env[`STAGING_${key.toUpperCase()}_ID`]!==value)throw new Error('Staging identity mismatch');
 if(!['staging_webhook_receiver','staging_webhook_worker'].includes(role))throw new Error('Restricted role required');
 const pooled=env.WEBHOOK_DATABASE_URL,direct=env.WEBHOOK_DIRECT_URL;
 for(const [url,host] of [[pooled,stagingHosts.pooled],[direct,stagingHosts.direct]]){
  if(!url)throw new Error('Explicit database override required');
  const u=new URL(url);
  if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!==host||u.pathname!=='/neondb'||decodeURIComponent(u.username)!==role||!u.password||u.hash||(u.port&&u.port!=='5432')||u.searchParams.getAll('sslmode').length!==1||u.searchParams.get('sslmode')!=='require'||Array.from(u.searchParams.keys()).some(k=>k!=='sslmode'))throw new Error('Database routing mismatch');
 }
 return {DATABASE_URL:pooled!,DIRECT_URL:direct!,DATABASE_URL_UNPOOLED:direct!};
}
const digestOf=(body:Buffer)=>createHash('sha256').update(body).digest('hex');
class BodyError extends Error {constructor(public status:number){super('Body unavailable');}}
async function readBody(request:Request,timeoutMs:number):Promise<Buffer>{
 if(request.signal.aborted)throw new BodyError(408);
 const reader=request.body?.getReader();if(!reader)throw new BodyError(400);
 let timer:ReturnType<typeof setTimeout>,abort:()=>void=()=>{};
 const failure=new Promise<never>((_,reject)=>{abort=()=>reject(new BodyError(408));timer=setTimeout(abort,timeoutMs);request.signal.addEventListener('abort',abort,{once:true});});
 const action=(async()=>{const chunks:Buffer[]=[];let size=0,reads=0;
  while(true){if(request.signal.aborted)throw new BodyError(408);const {done,value}=await reader.read();if(done)return Buffer.concat(chunks);if(++reads>4096)throw new BodyError(413);size+=value.length;if(size>262144)throw new BodyError(413);chunks.push(Buffer.from(value));}
 })();
 try{return await Promise.race([action,failure]);}
 catch(error){void reader.cancel().catch(()=>{});throw error;}
 finally{clearTimeout(timer!);request.signal.removeEventListener('abort',abort);}
}
export function receiver(db:Database,secret:string,wake:()=>Promise<void>=async()=>{},bodyTimeoutMs=5000){
 if(secret.length<32)throw new Error('Webhook secret unavailable');
 return async(request:Request):Promise<Response>=>{
  if(request.method!=='POST')return new Response(null,{status:405});
  const signature=request.headers.get('x-razorpay-signature')||'';
  if(!/^[a-f0-9]{64}$/i.test(signature))return new Response(null,{status:400});
  if(request.signal.aborted)return new Response(null,{status:408});
  if(Number(request.headers.get('content-length'))>262144)return new Response(null,{status:413});
  let raw:Buffer;try{raw=await readBody(request,bodyTimeoutMs);}catch(error){return new Response(null,{status:error instanceof BodyError?error.status:400});}
  if(request.signal.aborted)return new Response(null,{status:408});
  if(!timingSafeEqual(createHmac('sha256',secret).update(raw).digest(),Buffer.from(signature,'hex')))return new Response(null,{status:400});
  try{await db.query('INSERT INTO staging_webhook_inbox(digest,raw_body) VALUES($1,$2) ON CONFLICT(digest) DO NOTHING',[digestOf(raw),raw],{deadline:Date.now()+5000,signal:request.signal});}catch{return new Response(null,{status:503});}
  void Promise.resolve().then(wake).catch(()=>{});return new Response(null,{status:200});
 };
}
export async function drainOne(db:WorkerDatabase,apply:Apply,maxAttempts=8,operation:Operation={deadline:Date.now()+45000,signal:new AbortController().signal}){
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>32)throw new Error('Invalid attempt limit');
 await db.query("UPDATE staging_webhook_inbox SET state='dead',lease_token=NULL,lease_until=NULL,last_error='lease expired at attempt limit' WHERE state='leased' AND lease_until<=clock_timestamp() AND attempts >= $1",[maxAttempts],operation);
 const token=randomUUID();
 const {rows}=await db.query(`WITH candidate AS (SELECT digest FROM staging_webhook_inbox WHERE attempts<$1 AND ((state='ready' AND next_attempt<=clock_timestamp()) OR (state='leased' AND lease_until<=clock_timestamp())) ORDER BY received_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE staging_webhook_inbox i SET state='leased',attempts=attempts+1,lease_token=$2::uuid,lease_until=clock_timestamp()+interval '2 minutes' FROM candidate c WHERE i.digest=c.digest RETURNING i.*`,[maxAttempts,token],operation);
 if(!rows.length)return false;const row=rows[0];
 try{
  await db.transaction(operation,async tx=>{
   // Lock order: inbox → subscription → expert. Existing domain paths never lock inbox.
   const lease=await tx.query("SELECT digest FROM staging_webhook_inbox WHERE digest=$1 AND state='leased' AND lease_token=$2::uuid AND lease_until>clock_timestamp() FOR UPDATE",[row.digest,token]);
   if(!lease.rows.length)throw new Error('Lease lost');
   if(digestOf(Buffer.from(row.raw_body))!==row.digest)throw new Error('Inbox digest mismatch');
   const {snapshot}=await import('./snapshot');const input=snapshot(Buffer.from(row.raw_body),row.digest);if(input)await apply(tx.raw,input);
   const done=await tx.query("UPDATE staging_webhook_inbox SET state='done',lease_token=NULL,lease_until=NULL,last_error=NULL WHERE digest=$1 AND state='leased' AND lease_token=$2::uuid AND lease_until>clock_timestamp() RETURNING digest",[row.digest,token]);
   if(!done.rows.length)throw new Error('Lease expired before commit');
  });
 }catch(error){
  // Deadline/abort is an unknown outcome. Never retry inline; receiver/sweep recovery is durable.
  if(operation.signal.aborted||Date.now()>=operation.deadline)throw error;
  await db.query("UPDATE staging_webhook_inbox SET state=CASE WHEN attempts >= $3 THEN 'dead' ELSE 'ready' END,lease_token=NULL,lease_until=NULL,next_attempt=clock_timestamp()+make_interval(secs=>LEAST(1800,POWER(2,attempts)::integer)),last_error='processing failed' WHERE digest=$1 AND state='leased' AND lease_token=$2::uuid AND lease_until>clock_timestamp()",[row.digest,token,maxAttempts],operation);
 }
 return true;
}
export function workerAuthorization(header:string|null,secret:string){if(secret.length<32)throw new Error('Worker secret unavailable');return timingSafeEqual(createHash('sha256').update(header||'').digest(),createHash('sha256').update(`Bearer ${secret}`).digest());}
