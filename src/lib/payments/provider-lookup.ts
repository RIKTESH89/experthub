import { getRazorpay } from '@/lib/razorpay';
import { assertBillingEnabled, BillingRuntimeError, billingTimeout } from './billing-runtime';
import type { ProvisioningIntent } from './provisioning';
import type { PaidEvidence, ProviderLifecycle } from './reconciliation';
export type RecoveryIntent=ProvisioningIntent & {subscriberId:string;expertProfileId:string;tier:string;price:number};
export type ProviderReadClient={subscriptions:{all:(params:{count:number;skip:number;plan_id?:string})=>Promise<unknown>;fetch:(id:string)=>Promise<unknown>};plans:{fetch:(id:string)=>Promise<unknown>};payments:{fetch:(id:string)=>Promise<unknown>};invoices:{fetch:(id:string)=>Promise<unknown>}};
const record=(input:unknown):Record<string,unknown>=>input&&typeof input==='object'&&!Array.isArray(input)?input as Record<string,unknown>:{};
const date=(input:unknown)=>typeof input==='number'&&Number.isSafeInteger(input)&&input>0?new Date(input*1000):undefined;
export type RecoveryEvidence={intentId:string;providerId:string;providerLifecycle?:ProviderLifecycle;planSnapshot?:{period:string;interval:number;currency:string;amount:number}};
function lifecycle(sub:Record<string,unknown>):ProviderLifecycle {
 const statuses=['created','authenticated','active','pending','halted','cancelled','completed','expired'];
 if(!statuses.includes(String(sub.status)))throw new BillingRuntimeError('Provider lifecycle unavailable',409);
 const number=(value:unknown):number|null=>{if(value==null)return null;if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw new BillingRuntimeError('Provider lifecycle invalid',409);return value;};
 const bool=(value:unknown):boolean|null=>{if(value==null)return null;if(typeof value!=='boolean')throw new BillingRuntimeError('Provider lifecycle invalid',409);return value;};
 const remaining=sub.remaining_count==null?null:String(sub.remaining_count);
 if(remaining!==null&&!/^\d+$/.test(remaining))throw new BillingRuntimeError('Provider lifecycle invalid',409);
 return {status:sub.status as ProviderLifecycle['status'],endedAt:number(sub.ended_at),chargeAt:number(sub.charge_at),currentStart:number(sub.current_start),currentEnd:number(sub.current_end),hasScheduledChanges:bool(sub.has_scheduled_changes),changeScheduledAt:number(sub.change_scheduled_at),cancelAtCycleEnd:bool(sub.cancel_at_cycle_end),planId:typeof sub.plan_id==='string'?sub.plan_id:null,paidCount:number(sub.paid_count),totalCount:number(sub.total_count),remainingCount:remaining};
}
function optionalAmount(value:unknown):number|null {
 if(value==null)return null;
 if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw new BillingRuntimeError('Provider amount invalid',409);
 return value;
}
export function makeProviderRecoveryLookup(env:NodeJS.ProcessEnv=process.env,makeClient:()=>ProviderReadClient=()=>getRazorpay()) {
 const enabled=()=>{assertBillingEnabled('BILLING_PROVIDER_LOOKUP_ENABLED',env);if(!/^rzp_test_[A-Za-z0-9]+$/.test(env.RAZORPAY_KEY_ID||'')||!env.RAZORPAY_KEY_SECRET||env.RAZORPAY_KEY_SECRET.length<10)throw new BillingRuntimeError('Test provider lookup unavailable');};
 const call=async(operation:(client:ProviderReadClient)=>Promise<unknown>)=>{enabled();return record(await billingTimeout(()=>operation(makeClient()),5000));};
 return {
  async recover(intent:RecoveryIntent) {
   enabled();
   if(!['UNKNOWN','IN_FLIGHT'].includes(intent.state))return {outcome:'review-required' as const};
   try {
    const candidates:Record<string,unknown>[]=[];let complete=!!intent.providerId;
    if(intent.providerId)candidates.push(await call(client=>client.subscriptions.fetch(intent.providerId!)));
    else for(let page=0;page<2;page++) {
     const response=await call(client=>client.subscriptions.all({count:50,skip:page*50,...(intent.planId?{plan_id:intent.planId}:{})}));
     if(!Array.isArray(response.items))return {outcome:'unavailable' as const};
     candidates.push(...response.items.map(record).filter(item=>record(item.notes).provisioningIntentId===intent.id));
     if(response.items.length<50){complete=true;break;}
    }
    if(!complete)return {outcome:'review-required' as const,reason:'lookup-incomplete'};
    if(candidates.length!==1)return {outcome:'review-required' as const,reason:candidates.length?'ambiguous-match':'no-match'};
    const sub=candidates[0],notes=record(sub.notes);
    if(typeof sub.id!=='string'||!sub.id||typeof sub.plan_id!=='string'||(intent.providerId&&sub.id!==intent.providerId)||(intent.planId&&sub.plan_id!==intent.planId)||notes.provisioningIntentId!==intent.id||notes.subscriberId!==intent.subscriberId||notes.expertProfileId!==intent.expertProfileId||notes.tier!==intent.tier||!['created','authenticated','active','pending','halted'].includes(String(sub.status)))return {outcome:'review-required' as const,reason:'identity-mismatch'};
    const plan=await call(client=>client.plans.fetch(sub.plan_id as string)),item=record(plan.item);
    if(plan.id!==sub.plan_id||plan.period!=='monthly'||plan.interval!==1||item.currency!=='INR'||item.amount!==Math.round(intent.price*100))return {outcome:'review-required' as const,reason:'plan-mismatch'};
    return {outcome:'candidate' as const,evidence:{intentId:intent.id,providerId:sub.id,providerLifecycle:lifecycle(sub),planSnapshot:{period:'monthly',interval:1,currency:'INR',amount:Math.round(intent.price*100)}}};
   } catch {return {outcome:'unavailable' as const};}
  },
  async paidPeriod(providerId:string,paymentId:string):Promise<PaidEvidence> {
   enabled();
   const sub=await call(client=>client.subscriptions.fetch(providerId));
   const subscription=lifecycle(sub);
   if(['created','authenticated'].includes(subscription.status))throw new BillingRuntimeError('Paid provider lifecycle unavailable',409);
   const payment=await call(client=>client.payments.fetch(paymentId));
   if(sub.id!==providerId||payment.id!==paymentId||payment.status!=='captured'||payment.captured!==true||payment.amount_refunded!==0||typeof payment.invoice_id!=='string')throw new BillingRuntimeError('Verified paid evidence unavailable',409);
   const invoice=await call(client=>client.invoices.fetch(payment.invoice_id as string));
   const start=date(invoice.billing_start),end=date(invoice.billing_end);
   if(invoice.id!==payment.invoice_id||invoice.subscription_id!==providerId||invoice.payment_id!==paymentId||invoice.status!=='paid'||!start||!end||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>=end)throw new BillingRuntimeError('Verified paid interval unavailable',409);
   const amount=optionalAmount(payment.amount),amountPaid=optionalAmount(invoice.amount_paid),amountDue=optionalAmount(invoice.amount_due);
   const refundStatus=payment.refund_status==null||payment.refund_status==='null'?null:String(payment.refund_status);
   const currency=typeof payment.currency==='string'?payment.currency:null,invoiceCurrency=typeof invoice.currency==='string'?invoice.currency:null;
   if(refundStatus!==null||(amountDue!==null&&amountDue!==0)||(amount!==null&&amount===0)||(amountPaid!==null&&amountPaid===0)||(amount!==null&&amountPaid!==null&&amount!==amountPaid)||(currency!==null&&invoiceCurrency!==null&&currency!==invoiceCurrency))throw new BillingRuntimeError('Verified paid amounts unavailable',409);
   return {providerId,paymentId,captured:true,start,end,providerSnapshot:{subscription,payment:{status:String(payment.status),captured:true,amountRefunded:0,refundStatus,amount,currency,invoiceId:payment.invoice_id as string},invoice:{id:invoice.id as string,status:String(invoice.status),amountPaid,amountDue,currency:invoiceCurrency}}};
  },
 };
}
