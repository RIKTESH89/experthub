import { createHash } from 'crypto';
import { Resend } from 'resend';
import { newSubscriberEmail } from '@/lib/email/templates';
import { assertBillingEnabled, BillingRuntimeError, billingTimeout } from './billing-runtime';
export class TerminalBillingDeliveryError extends Error {}
export type PreparedBillingEmail={kind:'email';firstAttemptAt:string;message:{from:string;to:string;subject:string;html:string}}|{kind:'skip';reason:string};
export type BillingEmailPreparationStore={owns:(id:string,token:string,now:Date)=>Promise<boolean>;prepare:(id:string,token:string,now:Date,from:string)=>Promise<PreparedBillingEmail>};
export type EmailTransport={send:(message:{from:string;to:string;subject:string;html:string},options:{idempotencyKey:string})=>Promise<{data?:{id:string}|null;error?:{name:string;statusCode?:number|null}|null}>};
export function billingEmailConfiguration(env:NodeJS.ProcessEnv=process.env) {
 assertBillingEnabled('BILLING_EMAIL_DELIVERY_ENABLED',env);
 if(!/^re_[A-Za-z0-9_-]{8,}$/.test(env.RESEND_API_KEY||'') || !env.EMAIL_FROM || /[\r\n]/.test(env.EMAIL_FROM) || !/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/.test(env.EMAIL_FROM))throw new BillingRuntimeError('Billing email unavailable');
 try {const url=new URL(env.NEXT_PUBLIC_APP_URL||'');if(url.protocol!=='https:'||url.username||url.password)throw Error();}catch{throw new BillingRuntimeError('Billing email origin unavailable');}
 return {key:env.RESEND_API_KEY!,from:env.EMAIL_FROM};
}
export function makeBillingEmailDelivery(store:BillingEmailPreparationStore,tokenFor:(id:string)=>string,env:NodeJS.ProcessEnv=process.env,makeTransport:(key:string)=>EmailTransport=key=>new Resend(key).emails,now:()=>Date=()=>new Date()) {
 const config=billingEmailConfiguration(env);let transport:EmailTransport|undefined;
 return async (_payload:unknown,id:string)=>{
  billingEmailConfiguration(env); // gate also checked immediately before each preparation/send
  const prepared=await store.prepare(id,tokenFor(id),now(),config.from);
  if(prepared.kind==='skip')return;
  if(!await store.owns(id,tokenFor(id),now()))throw new Error('billing-email-lease-unavailable');
  // Resend retains keys 24h. Stop automatically before that boundary after possible success.
  const elapsed=now().getTime()-new Date(prepared.firstAttemptAt).getTime();
  if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=23*3600_000)throw new TerminalBillingDeliveryError('delivery-ambiguity-review-required');
  transport ||= makeTransport(config.key);
  const key=`billing/${createHash('sha256').update(id).digest('hex')}`;
  let result:Awaited<ReturnType<EmailTransport['send']>>;
  try {result=await billingTimeout(()=>transport!.send(prepared.message,{idempotencyKey:key}),10_000);} catch {throw new Error('billing-email-ack-unknown');}
  if(result.error){
   if(result.error.name==='concurrent_idempotent_requests')throw new Error('billing-email-retry');
   if([400,401,403,409,422].includes(result.error.statusCode||0))throw new TerminalBillingDeliveryError('billing-email-rejected');
   throw new Error('billing-email-retry');
  }
  if(!result.data?.id)throw new Error('billing-email-ack-unknown');
 };
}
export function renderBillingMessage(from:string,to:string,expertName:string,subscriberName:string) {
 const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 return {from,to,subject:`New subscriber: ${subscriberName.replace(/[\r\n]/g,' ').slice(0,200)}`,html:newSubscriberEmail(escape(expertName),escape(subscriberName))};
}
