import { createHmac, timingSafeEqual, createHash } from 'crypto';
import { assertBillingEnabled, BillingRuntimeError } from './billing-runtime';
import { planReconciliation, reconcile, type ReconciliationPlan, type LegacyRow, type PaidEvidence, type ReconciliationStore } from './reconciliation';
import { recoverProvisioning, type ProvisioningStore } from './provisioning';
import type { RecoveryIntent } from './provider-lookup';
export type ReviewProposal={kind:'reconcile';plan:ReconciliationPlan}|{kind:'recover';intent:RecoveryIntent;evidence:{intentId:string;providerId:string}};
export type BillingReviewDependencies={
 actor:()=>Promise<{id:string;role:string}|null>;
 loadRow:(id:string)=>Promise<LegacyRow>;
 loadIntent:(id:string)=>Promise<RecoveryIntent>;
 lookup:{recover:(intent:RecoveryIntent)=>Promise<{outcome:string;evidence?:{intentId:string;providerId:string}}>;paidPeriod:(providerId:string,paymentId:string)=>Promise<PaidEvidence>};
 reconciliation:(actorId:string,digest:string)=>ReconciliationStore;
 provisioning:(actorId:string,digest:string)=>ProvisioningStore;
 env?:NodeJS.ProcessEnv;now?:()=>Date;
};
function secret(env:NodeJS.ProcessEnv) {if(!env.BILLING_REVIEW_SECRET||env.BILLING_REVIEW_SECRET.trim().length<32)throw new BillingRuntimeError('Billing review unavailable');return env.BILLING_REVIEW_SECRET;}
const digest=(proposal:ReviewProposal)=>createHash('sha256').update(JSON.stringify(proposal)).digest('hex');
function unpack(token:string,key:string,actorId:string,now:Date):{proposal:ReviewProposal;digest:string} {
 const parts=token.split('.');if(parts.length!==2||parts[0].length>32768||!/^[a-f0-9]{64}$/.test(parts[1]))throw new BillingRuntimeError('Invalid review signature',400);
 const signature=createHmac('sha256',key).update(parts[0]).digest('hex');
 if(!timingSafeEqual(Buffer.from(signature),Buffer.from(parts[1])))throw new BillingRuntimeError('Invalid review signature',400);
 const parsed=JSON.parse(Buffer.from(parts[0],'base64url').toString());
 if(parsed.actorId!==actorId||!Number.isSafeInteger(parsed.expiresAt)||parsed.expiresAt<=now.getTime())throw new BillingRuntimeError('Review expired or actor changed',409);
 const proposal=parsed.proposal as ReviewProposal;
 if(proposal.kind==='reconcile')proposal.plan.evidence={...proposal.plan.evidence,start:new Date(proposal.plan.evidence.start),end:new Date(proposal.plan.evidence.end)};
 if(!['reconcile','recover'].includes(proposal.kind)||digest(proposal)!==parsed.digest)throw new BillingRuntimeError('Review input changed',409);
 return {proposal,digest:parsed.digest};
}
export async function reviewBilling(input:unknown,origin:string|null,deps:BillingReviewDependencies) {
 const env=deps.env||process.env;assertBillingEnabled('BILLING_REVIEW_ENABLED',env);const key=secret(env);
 let canonical:string;try {const url=new URL(env.NEXT_PUBLIC_APP_URL||'');if(url.username||url.password||(url.protocol!=='https:'&&!(env.NODE_ENV!=='production'&&url.protocol==='http:'&&url.hostname==='localhost')))throw Error();canonical=url.origin;}catch{throw new BillingRuntimeError('Review origin unavailable');}
 if(origin!==canonical)throw new BillingRuntimeError('Review origin rejected',403);
 const actor=await deps.actor();if(!actor)throw new BillingRuntimeError('Unauthorized',401);if(actor.role!=='ADMIN')throw new BillingRuntimeError('Administrator required',403);
 if(!input||typeof input!=='object'||Array.isArray(input))throw new BillingRuntimeError('Invalid review request',400);
 const body=input as Record<string,unknown>,now=deps.now?.()||new Date();
 if(body.action==='apply') {
  if(typeof body.token!=='string'||typeof body.reviewedDigest!=='string')throw new BillingRuntimeError('Explicit reviewed token and digest required',400);
  const signed=unpack(body.token,key,actor.id,now);if(body.reviewedDigest!==signed.digest)throw new BillingRuntimeError('Reviewed digest mismatch',409);
  if(signed.proposal.kind==='reconcile')return reconcile(signed.proposal.plan,deps.reconciliation(actor.id,signed.digest),{apply:true,reviewedDigest:signed.proposal.plan.digest});
  await recoverProvisioning(signed.proposal.intent,{...signed.proposal.evidence,reviewed:true},deps.provisioning(actor.id,signed.digest));return {outcome:'attached'};
 }
 if(body.action!=='plan'||typeof body.id!=='string'||!body.id||!['recover','reconcile'].includes(String(body.kind)))throw new BillingRuntimeError('Invalid review request',400);
 let proposal:ReviewProposal;
 if(body.kind==='recover') {
  const intent=await deps.loadIntent(body.id),candidate=await deps.lookup.recover(intent);
  if(candidate.outcome!=='candidate'||!candidate.evidence)return {outcome:'review-required'};
  proposal={kind:'recover',intent,evidence:candidate.evidence};
 } else {
  if(typeof body.paymentId!=='string'||!body.paymentId)throw new BillingRuntimeError('Payment identity required',400);
  const row=await deps.loadRow(body.id);if(!row.providerId)throw new BillingRuntimeError('Provider identity unavailable',409);
  proposal={kind:'reconcile',plan:planReconciliation(row,await deps.lookup.paidPeriod(row.providerId,body.paymentId))};
 }
 const reviewedDigest=digest(proposal),expiresAt=now.getTime()+10*60_000;
 const payload=Buffer.from(JSON.stringify({actorId:actor.id,proposal,digest:reviewedDigest,expiresAt})).toString('base64url');
 return {outcome:'dry-run',proposal,reviewedDigest,expiresAt,token:`${payload}.${createHmac('sha256',key).update(payload).digest('hex')}`};
}
