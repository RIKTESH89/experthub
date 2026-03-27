import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { razorpaySubscriptionId } = body;

    if (!razorpaySubscriptionId) {
      return NextResponse.json(
        { error: "razorpaySubscriptionId is required" },
        { status: 400 }
      );
    }

    // Find our DB record
    const sub = await prisma.expertSubscription.findFirst({
      where: {
        razorpaySubscriptionId,
        subscriberId: session.user.id,
      },
    });

    if (!sub) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Already active — no need to verify
    if (sub.status === "ACTIVE") {
      return NextResponse.json({ verified: true, status: "ACTIVE" });
    }

    // Check Razorpay subscription status directly
    const razorpay = getRazorpay();
    const rzpSub = await razorpay.subscriptions.fetch(razorpaySubscriptionId);

    if (rzpSub.status === "active" || rzpSub.status === "authenticated") {
      // Payment confirmed — activate subscription
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const wasPending = sub.status === "PENDING";

      await prisma.expertSubscription.update({
        where: { id: sub.id },
        data: {
          status: "ACTIVE",
          startDate: new Date(),
          currentPeriodEnd,
        },
      });

      if (wasPending) {
        await prisma.expertProfile.update({
          where: { id: sub.expertProfileId },
          data: { totalSubscribers: { increment: 1 } },
        });

        // Notify expert
        const expertProfile = await prisma.expertProfile.findUnique({
          where: { id: sub.expertProfileId },
          select: { userId: true },
        });

        if (expertProfile) {
          const subscriber = await prisma.user.findUnique({
            where: { id: sub.subscriberId },
            select: { name: true },
          });

          await prisma.notification.create({
            data: {
              userId: expertProfile.userId,
              title: "New Premium Subscriber",
              message: `${subscriber?.name || "Someone"} subscribed to your Premium plan!`,
              link: "/expert/subscribers",
            },
          });

          sendNotificationEmail({
            type: "new_subscriber",
            recipientUserId: expertProfile.userId,
            data: { subscriberName: subscriber?.name || "Someone" },
          }).catch(() => {});
        }
      }

      return NextResponse.json({ verified: true, status: "ACTIVE" });
    }

    return NextResponse.json({
      verified: false,
      status: rzpSub.status,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
