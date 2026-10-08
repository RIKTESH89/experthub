import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { billingHealth } from '@/lib/payments/billing-health';
import { assertBillingEnabled, BillingRuntimeError } from '@/lib/payments/billing-runtime';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET() {
  try {
    assertBillingEnabled('BILLING_REVIEW_ENABLED');
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    return NextResponse.json(await billingHealth(session.user.id), { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof BillingRuntimeError ? error.message : 'Billing health unavailable' }, { status: error instanceof BillingRuntimeError ? error.status : 503, headers });
  }
}
