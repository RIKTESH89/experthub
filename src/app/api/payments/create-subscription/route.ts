import { beginProvisioning, provisioningStore } from "@/lib/payments/provisioning-store";
import { provision } from "@/lib/payments/provisioning";
import { isPreviewIsolated } from "@/lib/preview-isolation";
import { cancelSubscription } from "@/lib/payments/cancel";
import { hasSubscriptionAccess } from "@/lib/payments/access";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  if (isPreviewIsolated()) return NextResponse.json({ error: "External services are disabled in Preview" }, { status: 503 });
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { expertId, tier } = body;

    if (typeof expertId !== "string" || !["FREE", "STANDARD", "PREMIUM"].includes(tier)) {
      return NextResponse.json(
        { error: "expertId and tier are required" },
        { status: 400 }
      );
    }

    // FREE tier doesn't need payment
    if (tier === "FREE") {
      return NextResponse.json(
        { error: "Free tier does not require payment. Use the subscribe API directly." },
        { status: 400 }
      );
    }

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: expertId },
      include: { user: { select: { name: true } } },
    });

    if (!expertProfile) {
      return NextResponse.json({ error: "Expert not found" }, { status: 404 });
    }

    if (session.user.id === expertId) {
      return NextResponse.json(
        { error: "You cannot subscribe to yourself" },
        { status: 400 }
      );
    }

    // Check for existing active subscription
    const existing = await prisma.expertSubscription.findUnique({
      where: {
        subscriberId_expertProfileId: {
          subscriberId: session.user.id,
          expertProfileId: expertProfile.id,
        },
      },
    });

    if (existing && hasSubscriptionAccess(existing)) {
      return NextResponse.json(
        { error: "You already have an active subscription to this expert" },
        { status: 409 }
      );
    }

    // If there's a PENDING subscription, cancel the old Razorpay subscription first
    if (existing && existing.razorpaySubscriptionId && existing.status !== "PENDING") {
      try {
        await cancelSubscription(existing.id, session.user.id);
      } catch {
        return NextResponse.json({ error: "Existing payment subscription could not be cancelled. Retry or contact support." }, { status: 503 });
      }
    }

    // Look up pricing tier
    const pricingTier = await prisma.expertPricingTier.findUnique({
      where: {
        expertProfileId_tier: {
          expertProfileId: expertProfile.id,
          tier,
        },
      },
    });

    if (!pricingTier || pricingTier.price <= 0) {
      return NextResponse.json(
        { error: "Invalid pricing tier" },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(pricingTier.price * 100);

    const razorpay = getRazorpay();

    const intent = await beginProvisioning(session.user.id, expertProfile.id, tier, pricingTier.price);
    const result = await provision(intent, provisioningStore, {
      createPlan: async () => (await razorpay.plans.create({ period: "monthly", interval: 1, item: { name: `${expertProfile.displayName} - ${tier} Plan`, amount: amountInPaise, currency: "INR" } })).id,
      createSubscription: async (planId, intentId) => (await razorpay.subscriptions.create({ plan_id: planId, total_count: 120, quantity: 1, notes: { provisioningIntentId: intentId, subscriberId: session.user.id, expertProfileId: expertProfile.id, tier } })).id,
    });
    if (result.outcome !== "attached" || !result.providerId) return NextResponse.json({ error: "Payment provisioning requires recovery review", intentId: intent.id, code: "PROVISIONING_REVIEW_REQUIRED" }, { status: 503 });
    return NextResponse.json({
      subscriptionId: result.providerId,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency: "INR",
      expertName: expertProfile.displayName,
    });
  } catch (error) {
    console.error("Create payment subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
