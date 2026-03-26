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
      // Cancel subscription
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
      // Re-activate cancelled/expired subscription
      const { tier } = await request.json().catch(() => ({}));

      const updateData: Record<string, unknown> = {
        status: "ACTIVE",
        startDate: new Date(),
        endDate: null,
      };

      if (tier) {
        const pricingTier = await prisma.expertPricingTier.findUnique({
          where: {
            expertProfileId_tier: {
              expertProfileId: expertProfile.id,
              tier,
            },
          },
        });
        if (pricingTier) {
          updateData.tier = tier;
          updateData.price = pricingTier.price;
        }
      }

      await prisma.expertSubscription.update({
        where: { id: existingSubscription.id },
        data: updateData,
      });

      await prisma.expertProfile.update({
        where: { id: expertProfile.id },
        data: { totalSubscribers: { increment: 1 } },
      });

      isSubscribed = true;
    } else {
      // Create new subscription
      const body = await request.json().catch(() => ({}));
      const requestedTier = body?.tier || "FREE";

      let subscriptionPrice = expertProfile.monthlyPrice;
      const subscriptionTier = requestedTier;

      const pricingTier = await prisma.expertPricingTier.findUnique({
        where: {
          expertProfileId_tier: {
            expertProfileId: expertProfile.id,
            tier: requestedTier,
          },
        },
      });

      if (pricingTier) {
        subscriptionPrice = pricingTier.price;
      }

      await prisma.expertSubscription.create({
        data: {
          subscriberId: session.user.id,
          expertProfileId: expertProfile.id,
          status: "ACTIVE",
          price: subscriptionPrice,
          tier: subscriptionTier,
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
