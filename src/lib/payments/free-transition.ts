import { enqueueBilling } from "./billing-store";
import prisma from "@/lib/prisma";
import { subscriptionAccessWhere, hasSubscriptionAccess } from "./access";
import { PaymentError } from "./state";
export async function changeExistingFree(id: string, subscriberId: string, mode: "activate" | "cancel") {
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT "id" FROM "ExpertSubscription" WHERE "id"=${id} FOR UPDATE`;
  const sub=await tx.expertSubscription.findUniqueOrThrow({where:{id}});
  if(sub.subscriberId!==subscriberId)throw new PaymentError("Forbidden",403);
  const open=await tx.$queryRaw<{id:string}[]>`SELECT "id" FROM "BillingProvisioning" WHERE "subscriptionId"=${id} AND "state"<>'ATTACHED'`;
  if(open.length)throw new PaymentError("Payment provisioning requires recovery review",409);
  if(mode==='cancel' && sub.tier!=='FREE')throw new PaymentError("Subscription changed",409);
  if(mode==='activate' && sub.tier!=='FREE' && (hasSubscriptionAccess(sub) || (sub.razorpaySubscriptionId && sub.status!=='CANCELLED')))throw new PaymentError("Payment subscription changed; retry",409);
  await tx.$queryRaw`SELECT "id" FROM "ExpertProfile" WHERE "id"=${sub.expertProfileId} FOR UPDATE`;
  const status=mode==='activate'?'ACTIVE':'CANCELLED';
  if(sub.status!==status || sub.tier!=='FREE') {
   await tx.expertSubscription.update({where:{id},data: mode==='cancel'?{status,endDate:new Date()}:{status,tier:'FREE',price:0,startDate:new Date(),endDate:null,razorpaySubscriptionId:null,razorpayPaymentId:null,currentPeriodEnd:null,paidPeriodStart:null,renewalCancelledAt:null,lastPaymentEventAt:null,lastPaymentEventRank:0}});
   await tx.$executeRaw`UPDATE "ExpertSubscription" SET "billingVersion"="billingVersion"+1 WHERE "id"=${id}`;
  }
  const count=await tx.expertSubscription.count({where:{expertProfileId:sub.expertProfileId,...subscriptionAccessWhere()}});
  await tx.expertProfile.update({where:{id:sub.expertProfileId},data:{totalSubscribers:count}});
 });
}

/** First-row creation holds expert serialization, then rereads the pair. Any row that
 * appeared while waiting is a conflict, never a blind overwrite of a paid intent. */
export async function createFreeSubscription(subscriberId: string, expertProfileId: string, subscriberName: string) {
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT "id" FROM "ExpertProfile" WHERE "id"=${expertProfileId} FOR UPDATE`;
  const existing=await tx.expertSubscription.findUnique({where:{subscriberId_expertProfileId:{subscriberId,expertProfileId}}});
  if(existing) {
   if(existing.tier==='FREE' && existing.status==='ACTIVE') return existing;
   throw new PaymentError("Subscription changed; retry",409);
  }
  const open=await tx.$queryRaw<{id:string}[]>`SELECT "id" FROM "BillingProvisioning" WHERE "subscriberId"=${subscriberId} AND "expertProfileId"=${expertProfileId} AND "state"<>'ATTACHED'`;
  if(open.length)throw new PaymentError("Payment provisioning requires recovery review",409);
  const expert=await tx.expertProfile.findUniqueOrThrow({where:{id:expertProfileId},select:{userId:true}});
  const sub=await tx.expertSubscription.create({data:{subscriberId,expertProfileId,status:'ACTIVE',price:0,tier:'FREE'}});
  const count=await tx.expertSubscription.count({where:{expertProfileId,...subscriptionAccessWhere()}});
  await tx.expertProfile.update({where:{id:expertProfileId},data:{totalSubscribers:count}});
  const notificationId=`free-activation-${sub.id}`;
  await tx.notification.create({data:{id:notificationId,userId:expert.userId,title:'New Subscriber',message:`${subscriberName} subscribed to you!`,link:'/expert/subscribers'}});
  await enqueueBilling(tx,notificationId,{type:'new_subscriber',recipientUserId:expert.userId,subscriberName});
  return sub;
 });
}
