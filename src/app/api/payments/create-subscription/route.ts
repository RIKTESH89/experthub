import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { expertId, tier } = body;

    if (!expertId || !tier) {
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

    if (existing && existing.status === "ACTIVE") {
      return NextResponse.json(
        { error: "You already have an active subscription to this expert" },
        { status: 409 }
      );
    }

    // If there's a PENDING subscription, cancel the old Razorpay subscription first
    if (existing && existing.status === "PENDING" && existing.razorpaySubscriptionId) {
      try {
        const razorpayForCancel = getRazorpay();
        await razorpayForCancel.subscriptions.cancel(existing.razorpaySubscriptionId);
      } catch {
        // Old subscription may already be expired/cancelled on Razorpay — safe to ignore
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

    // Create a Razorpay plan (each subscription gets its own plan to handle price changes)
    const plan = await razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: {
        name: `${expertProfile.displayName} - ${tier} Plan`,
        amount: amountInPaise,
        currency: "INR",
        description: `Monthly subscription to ${expertProfile.displayName}`,
      },
    });

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.id,
      total_count: 120, // Max 10 years
      quantity: 1,
      notes: {
        subscriberId: session.user.id,
        expertProfileId: expertProfile.id,
        tier,
        expertName: expertProfile.displayName,
      },
    });

    // Create a PENDING subscription in our DB
    // If DB write fails, cancel the Razorpay subscription to avoid orphans
    try {
      if (existing) {
        await prisma.expertSubscription.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            tier: tier as "FREE" | "STANDARD" | "PREMIUM",
            price: pricingTier.price,
            razorpaySubscriptionId: subscription.id,
            startDate: new Date(),
            endDate: null,
          },
        });
      } else {
        await prisma.expertSubscription.create({
          data: {
            subscriberId: session.user.id,
            expertProfileId: expertProfile.id,
            status: "PENDING",
            price: pricingTier.price,
            tier: tier as "FREE" | "STANDARD" | "PREMIUM",
            razorpaySubscriptionId: subscription.id,
          },
        });
      }
    } catch (dbError) {
      // DB write failed — cancel the Razorpay subscription to prevent orphan
      console.error("DB write failed after Razorpay subscription created, cancelling:", dbError);
      try {
        await razorpay.subscriptions.cancel(subscription.id);
      } catch {
        console.error("Failed to cancel orphaned Razorpay subscription:", subscription.id);
      }
      throw dbError; // Re-throw to hit outer catch and return 500
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
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
