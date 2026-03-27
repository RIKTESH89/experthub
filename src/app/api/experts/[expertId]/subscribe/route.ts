import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ expertId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { expertId } = await params;

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: expertId },
      include: { user: { select: { name: true } } },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert not found" },
        { status: 404 }
      );
    }

    if (session.user.id === expertId) {
      return NextResponse.json(
        { error: "You cannot subscribe to yourself" },
        { status: 400 }
      );
    }

    const existingSubscription = await prisma.expertSubscription.findUnique({
      where: {
        subscriberId_expertProfileId: {
          subscriberId: session.user.id,
          expertProfileId: expertProfile.id,
        },
      },
    });

    let isSubscribed: boolean;

    if (existingSubscription && existingSubscription.status === "ACTIVE") {
      // If it's a paid subscription with Razorpay, cancel via payment API
      if (existingSubscription.razorpaySubscriptionId) {
        try {
          const { getRazorpay } = await import("@/lib/razorpay");
          const razorpay = getRazorpay();
          await razorpay.subscriptions.cancel(existingSubscription.razorpaySubscriptionId);
        } catch (error) {
          console.error("Failed to cancel Razorpay subscription:", error);
        }
      }

      // Cancel subscription in DB
      await prisma.expertSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "CANCELLED",
          endDate: new Date(),
        },
      });

      await prisma.expertProfile.update({
        where: { id: expertProfile.id },
        data: { totalSubscribers: { decrement: 1 } },
      });

      isSubscribed = false;
    } else if (existingSubscription) {
      // Re-activate existing subscription (FREE tier only — paid goes through payment API)
      const { tier } = await request.json().catch(() => ({}));
      const requestedTier = tier || "FREE";

      if (requestedTier !== "FREE") {
        return NextResponse.json(
          { error: "Paid subscriptions require payment. Use the payment API.", requiresPayment: true },
          { status: 402 }
        );
      }

      // If PENDING, cancel the orphaned Razorpay subscription first
      if (existingSubscription.status === "PENDING" && existingSubscription.razorpaySubscriptionId) {
        try {
          const { getRazorpay } = await import("@/lib/razorpay");
          const razorpay = getRazorpay();
          await razorpay.subscriptions.cancel(existingSubscription.razorpaySubscriptionId);
        } catch {
          // Safe to ignore — may already be expired on Razorpay
        }
      }

      const wasPreviouslyActive = existingSubscription.status === "ACTIVE";

      await prisma.expertSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "ACTIVE",
          tier: "FREE",
          price: 0,
          startDate: new Date(),
          endDate: null,
          razorpaySubscriptionId: null,
          razorpayPaymentId: null,
          currentPeriodEnd: null,
        },
      });

      // Only increment if wasn't already active
      if (!wasPreviouslyActive) {
        await prisma.expertProfile.update({
          where: { id: expertProfile.id },
          data: { totalSubscribers: { increment: 1 } },
        });
      }

      isSubscribed = true;
    } else {
      // Create new subscription
      const body = await request.json().catch(() => ({}));
      const requestedTier = body?.tier || "FREE";

      // Paid tiers must go through /api/payments/create-subscription
      if (requestedTier !== "FREE") {
        return NextResponse.json(
          { error: "Paid subscriptions require payment. Use the payment API.", requiresPayment: true },
          { status: 402 }
        );
      }

      await prisma.expertSubscription.create({
        data: {
          subscriberId: session.user.id,
          expertProfileId: expertProfile.id,
          status: "ACTIVE",
          price: 0,
          tier: "FREE",
        },
      });

      await prisma.expertProfile.update({
        where: { id: expertProfile.id },
        data: { totalSubscribers: { increment: 1 } },
      });

      // Notify the expert
      await prisma.notification.create({
        data: {
          userId: expertId,
          title: "New Subscriber",
          message: `${session.user.name || "Someone"} subscribed to you!`,
          link: `/expert/subscribers`,
        },
      });

      // Fire-and-forget email notification
      sendNotificationEmail({
        type: "new_subscriber",
        recipientUserId: expertId,
        data: { subscriberName: session.user.name || "Someone" },
      }).catch(() => {});

      isSubscribed = true;
    }

    const updatedProfile = await prisma.expertProfile.findUnique({
      where: { id: expertProfile.id },
      select: { totalSubscribers: true },
    });

    return NextResponse.json({
      isSubscribed,
      totalSubscribers: updatedProfile?.totalSubscribers || 0,
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
