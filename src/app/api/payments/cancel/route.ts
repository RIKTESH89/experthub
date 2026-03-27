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
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionId is required" },
        { status: 400 }
      );
    }

    const subscription = await prisma.expertSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.subscriberId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["ACTIVE", "PAST_DUE", "PENDING"].includes(subscription.status)) {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 400 }
      );
    }

    // Cancel on Razorpay if it has a Razorpay subscription
    if (subscription.razorpaySubscriptionId) {
      try {
        const razorpay = getRazorpay();
        await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId);
      } catch (error) {
        console.error("Failed to cancel on Razorpay:", error);
        // Continue with DB cancellation even if Razorpay fails
      }
    }

    const wasActive = subscription.status === "ACTIVE" || subscription.status === "PAST_DUE";

    // Cancel in DB
    await prisma.expertSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "CANCELLED",
        endDate: new Date(),
      },
    });

    // Only decrement subscriber count if it was actually active
    if (wasActive) {
      await prisma.expertProfile.update({
        where: { id: subscription.expertProfileId },
        data: { totalSubscribers: { decrement: 1 } },
      });
    }

    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
