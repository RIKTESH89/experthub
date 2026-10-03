import { changeExistingFree, createFreeSubscription } from "@/lib/payments/free-transition";
import { hasSubscriptionAccess } from "@/lib/payments/access";
import { cancelSubscription } from "@/lib/payments/cancel";
import { PaymentError } from "@/lib/payments/state";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    if (existingSubscription && hasSubscriptionAccess(existingSubscription)) {
      if (existingSubscription.razorpaySubscriptionId) {
        await cancelSubscription(existingSubscription.id, session.user.id);
      } else {
        await changeExistingFree(existingSubscription.id, session.user.id, "cancel");
      }

      isSubscribed = existingSubscription.razorpaySubscriptionId ? hasSubscriptionAccess(await prisma.expertSubscription.findUnique({ where: { id: existingSubscription.id } })) : false;
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

      if (existingSubscription.razorpaySubscriptionId) {
        await cancelSubscription(existingSubscription.id, session.user.id);
      }

      await changeExistingFree(existingSubscription.id, session.user.id, "activate");

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

      await createFreeSubscription(session.user.id, expertProfile.id, session.user.name || "Someone");

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
    if (error instanceof PaymentError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
