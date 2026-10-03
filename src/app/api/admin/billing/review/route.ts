import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { BillingRuntimeError, assertBillingEnabled } from '@/lib/payments/billing-runtime';
import { reviewBilling } from '@/lib/payments/billing-review';
import { reviewedReconciliationStore } from '@/lib/payments/billing-store';
import { reviewedProvisioningStore } from '@/lib/payments/provisioning-store';
import { makeProviderRecoveryLookup, type RecoveryIntent } from '@/lib/payments/provider-lookup';
export const maxDuration=60;
export async function POST(request:NextRequest) {
 try {
  assertBillingEnabled('BILLING_REVIEW_ENABLED');
  if(Number(request.headers.get('content-length')||0)>32768)throw new BillingRuntimeError('Request too large',413);
  const raw=await request.text();if(Buffer.byteLength(raw)>32768)throw new BillingRuntimeError('Request too large',413);
  const input=JSON.parse(raw);
  return NextResponse.json(await reviewBilling(input,request.headers.get('origin'),{
   actor:async()=>{const session=await auth();if(!session?.user?.id)return null;const user=await prisma.user.findUnique({where:{id:session.user.id},select:{id:true,role:true,isActive:true,isBanned:true}});return user?.isActive&&!user.isBanned?{id:user.id,role:user.role}:null;},
   loadRow:async id=>{const rows=await prisma.$queryRaw<{id:string;billingVersion:number;razorpaySubscriptionId:string|null;cancelled:boolean}[]>`SELECT "id","billingVersion","razorpaySubscriptionId",("renewalCancelledAt" IS NOT NULL OR "status"='CANCELLED') AS cancelled FROM "ExpertSubscription" WHERE "id"=${id}`;if(!rows[0])throw new BillingRuntimeError('Subscription not found',404);return {id,version:rows[0].billingVersion,providerId:rows[0].razorpaySubscriptionId,cancelled:rows[0].cancelled};},
   loadIntent:async id=>{const rows=await prisma.$queryRaw<RecoveryIntent[]>`SELECT * FROM "BillingProvisioning" WHERE "id"=${id}`;if(!rows[0])throw new BillingRuntimeError('Intent not found',404);return rows[0];},
   lookup:makeProviderRecoveryLookup(),reconciliation:reviewedReconciliationStore,provisioning:reviewedProvisioningStore,
  }));
 }catch(error){return NextResponse.json({error:error instanceof BillingRuntimeError?error.message:'Billing review failed'},{status:error instanceof BillingRuntimeError?error.status:error instanceof SyntaxError?400:409});}
}
