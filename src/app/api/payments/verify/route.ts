import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasPaidAccess } from "@/lib/payments/access";

// B1: authenticated/active provider status alone is not proof of a settled charge.
// Confirmation comes from the signed charged receipt + authoritative period transaction.
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { razorpaySubscriptionId } = await request.json();
    if (typeof razorpaySubscriptionId !== "string" || !razorpaySubscriptionId) return NextResponse.json({ error: "razorpaySubscriptionId is required" }, { status: 400 });
    const sub = await prisma.expertSubscription.findFirst({ where: { razorpaySubscriptionId, subscriberId: session.user.id } });
    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    const verified = hasPaidAccess(sub);
    return NextResponse.json({ verified, status: sub.status, renewalCancelled: !!sub.renewalCancelledAt, currentPeriodEnd: sub.currentPeriodEnd,
      ...(!verified ? { code: "AWAITING_CONFIRMED_PAID_PERIOD" } : {}) });
  } catch {
    return NextResponse.json({ error: "Verification unavailable" }, { status: 500 });
  }
}
