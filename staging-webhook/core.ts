import { createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import type { PaymentSnapshot } from '../src/lib/payments/state';
export interface Database { query(sql:string, values?:unknown[]):Promise<{rows:any[]}> }
export const stagingIdentity = { project:'steep-wildflower-10013234', branch:'br-steep-pond-b3xfo61k', endpoint:'ep-quiet-bread-b3rqji3g' } as const;
export function credentials(env:NodeJS.ProcessEnv) {
 for(const [key,value] of Object.entries(stagingIdentity)) if(env[`STAGING_${key.toUpperCase()}_ID`]!==value) throw new Error('Staging identity mismatch');
 const pooled=env.WEBHOOK_DATABASE_URL, direct=env.WEBHOOK_DIRECT_URL;
 for(const url of [pooled,direct]) {
  if(!url)throw new Error('Explicit database override required');
  const u=new URL(url); if(!['postgres:','postgresql:'].includes(u.protocol)||u.pathname.length<2||![`${stagingIdentity.endpoint}.`,`${stagingIdentity.endpoint}-pooler.`].some(p=>u.hostname.startsWith(p)) || !u.hostname.endsWith('.neon.tech') || u.searchParams.get('sslmode')!=='require')throw new Error('Database endpoint mismatch');
 }
 // Always replace BOTH credentials injected by the function platform before importing Prisma.
 return {DATABASE_URL:pooled!,DIRECT_URL:direct!,DATABASE_URL_UNPOOLED:direct!};
}
const digestOf=(body:Buffer)=>createHash('sha256').update(body).digest('hex');
export function receiver(db:Database, secret:string, wake:()=>Promise<void>=async()=>{}) {
 if(secret.length<32)throw new Error('Webhook secret unavailable');
 return async (request:Request):Promise<Response>=> {
  if(request.method!=='POST')return new Response(null,{status:405});
  if(Number(request.headers.get('content-length'))>262144)return new Response(null,{status:413});
  const reader=request.body?.getReader(); if(!reader)return new Response(null,{status:400});
  const chunks:Buffer[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>262144){await reader.cancel();return new Response(null,{status:413});}chunks.push(Buffer.from(value));}
  const raw=Buffer.concat(chunks), signature=request.headers.get('x-razorpay-signature')||'';
  if(!/^[a-f0-9]{64}$/i.test(signature)||!timingSafeEqual(createHmac('sha256',secret).update(raw).digest(),Buffer.from(signature,'hex')))return new Response(null,{status:400});
  // Signature authenticates bytes, never the event-ID header. Parsing is deferred to worker.
  try {await db.query('INSERT INTO staging_webhook_inbox(digest,raw_body) VALUES($1,$2) ON CONFLICT(digest) DO NOTHING',[digestOf(raw),raw]);}
  catch {return new Response(null,{status:503});}
  // INSERT is one autocommit statement; acknowledgement follows durable commit.
  void Promise.resolve().then(wake).catch(()=>{});
  return new Response(null,{status:200});
 };
}
export async function drainOne(db:Database,apply:(s:PaymentSnapshot)=>Promise<unknown>,maxAttempts=8) {
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>32)throw new Error('Invalid attempt limit');
 // Expired final leases are dead-lettered even when a worker crashed on its last attempt.
 await db.query("UPDATE staging_webhook_inbox SET state='dead',lease_token=NULL,lease_until=NULL,last_error='lease expired at attempt limit' WHERE state='leased' AND lease_until<=now() AND attempts >= $1",[maxAttempts]);
 const token=randomUUID();
 const {rows}=await db.query(`WITH candidate AS (SELECT digest FROM staging_webhook_inbox WHERE attempts<$1 AND ((state='ready' AND next_attempt<=now()) OR (state='leased' AND lease_until<=now())) ORDER BY received_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE staging_webhook_inbox i SET state='leased',attempts=attempts+1,lease_token=$2::uuid,lease_until=now()+interval '2 minutes' FROM candidate c WHERE i.digest=c.digest RETURNING i.*`,[maxAttempts,token]);
 if(!rows.length)return false;
 const row=rows[0];
 try {
  if(digestOf(Buffer.from(row.raw_body))!==row.digest)throw new Error('Inbox digest mismatch');
  const {snapshot}=await import('./snapshot');
  const input=snapshot(Buffer.from(row.raw_body),row.digest);if(input)await apply(input);
  await db.query("UPDATE staging_webhook_inbox SET state='done',lease_token=NULL,lease_until=NULL,last_error=NULL WHERE digest=$1 AND lease_token=$2::uuid AND lease_until>now()",[row.digest,token]);
 } catch {
  await db.query("UPDATE staging_webhook_inbox SET state=CASE WHEN attempts >= $3 THEN 'dead' ELSE 'ready' END,lease_token=NULL,lease_until=NULL,next_attempt=now()+make_interval(secs=>LEAST(1800,POWER(2,attempts)::integer)),last_error='processing failed' WHERE digest=$1 AND lease_token=$2::uuid AND lease_until>now()",[row.digest,token,maxAttempts]);
 }
 return true;
}
export function workerAuthorization(header:string|null,secret:string) {
 if(secret.length<32)throw new Error('Worker secret unavailable');
 return timingSafeEqual(createHash('sha256').update(header||'').digest(),createHash('sha256').update(`Bearer ${secret}`).digest());
}
