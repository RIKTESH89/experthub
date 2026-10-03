import prisma from '@/lib/prisma';
import { TerminalBillingDeliveryError, renderBillingMessage, type BillingEmailPreparationStore, type PreparedBillingEmail } from './billing-email';
export const billingEmailPreparationStore:BillingEmailPreparationStore={
 owns:async(id,token,now)=>(await prisma.$queryRaw<{id:string}[]>`SELECT "id" FROM "BillingOutbox" WHERE "id"=${id} AND "state"='LEASED' AND "leaseToken"=${token} AND "leaseUntil">${now}`).length===1,
 prepare:(id,token,now,from)=>prisma.$transaction(async tx=>{
  const rows=await tx.$queryRaw<{payload:Record<string,unknown>}[]>`SELECT "payload" FROM "BillingOutbox" WHERE "id"=${id} AND "state"='LEASED' AND "leaseToken"=${token} AND "leaseUntil">${now} FOR UPDATE`;
  if(!rows.length)throw new Error('Billing lease unavailable');
  const payload=rows[0].payload;
  if(['billing_reconciled','billing_review_audit'].includes(String(payload.type)))return {kind:'skip',reason:'in-app-audit-only'};
  if(payload.type!=='new_subscriber'||typeof payload.recipientUserId!=='string'||typeof payload.subscriberName!=='string')throw new TerminalBillingDeliveryError('billing-payload-invalid');
  const user=await tx.user.findUnique({where:{id:payload.recipientUserId},include:{settings:true}});
  if(!user?.email||!user.isActive||user.isBanned||user.settings?.emailOnNewSubscriber===false)return {kind:'skip',reason:'recipient-preference'};
  const existing=payload._billingEmail as PreparedBillingEmail|undefined;
  if(existing){
   if(existing.kind!=='email'||!existing.firstAttemptAt||!existing.message?.to)throw new TerminalBillingDeliveryError('billing-envelope-invalid');
   if(existing.message.to!==user.email)return {kind:'skip',reason:'recipient-address-changed'};
   return existing;
  }
  const prepared:PreparedBillingEmail={kind:'email',firstAttemptAt:now.toISOString(),message:renderBillingMessage(from,user.email,user.name||'Expert',payload.subscriberName)};
  await tx.$executeRaw`UPDATE "BillingOutbox" SET "payload"=${JSON.stringify({...payload,_billingEmail:prepared})}::jsonb WHERE "id"=${id} AND "leaseToken"=${token}`;
  return prepared;
 }),
};
