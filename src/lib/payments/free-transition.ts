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
