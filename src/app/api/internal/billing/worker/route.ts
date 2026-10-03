import { NextRequest, NextResponse } from 'next/server';
import { billingOutboxStore } from '@/lib/payments/billing-store';
import { billingEmailPreparationStore } from '@/lib/payments/billing-email-store';
import { runBillingWorker } from '@/lib/payments/billing-worker';
import { BillingRuntimeError } from '@/lib/payments/billing-runtime';
const workerPath="/api/internal/billing/worker";
function methodNotAllowed() {return NextResponse.json({error:"Method not allowed"},{status:405,headers:{Allow:"POST"}});}
export const GET=methodNotAllowed;
export const PUT=methodNotAllowed;
export const PATCH=methodNotAllowed;
export const DELETE=methodNotAllowed;
export const HEAD=methodNotAllowed;
export const OPTIONS=methodNotAllowed;
export async function POST(request:NextRequest) {
 if(request.method!=="POST")return methodNotAllowed();
 if(request.nextUrl.pathname!==workerPath)return NextResponse.json({error:"Not found"},{status:404});
 try {return NextResponse.json(await runBillingWorker(request.headers.get('authorization'),{store:billingOutboxStore,preparation:billingEmailPreparationStore}));}
 catch(error){return NextResponse.json({error:error instanceof BillingRuntimeError?error.message:'Billing worker unavailable'},{status:error instanceof BillingRuntimeError?error.status:503});}
}

export const maxDuration = 60;
