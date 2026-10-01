import { hasSubscriptionAccess } from "@/lib/payments/access";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkTrialAccess } from "@/lib/trial";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expertId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { expertId } = await params;

    // Look up expertProfile by userId = expertId
    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: expertId },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert not found" },
        { status: 404 }
      );
    }

    // Check if user has an active subscription
    const subscription = await prisma.expertSubscription.findUnique({
      where: {
        subscriberId_expertProfileId: {
          subscriberId: session.user.id,
          expertProfileId: expertProfile.id,
        },
      },
    });

    const hasSubscription =
      hasSubscriptionAccess(subscription);

    if (hasSubscription && subscription) {
      // Look up the tier's monthly question limit
      const pricingTier = await prisma.expertPricingTier.findUnique({
        where: {
          expertProfileId_tier: {
            expertProfileId: expertProfile.id,
            tier: subscription.tier,
          },
        },
      });

      const monthlyLimit = pricingTier?.monthlyQuestions ?? null; // null = unlimited

      // Get current month's usage
      const now = new Date();
      const monthKey = now.getFullYear() * 100 + (now.getMonth() + 1);

      const monthlyUsage = await prisma.monthlyTwinUsage.findUnique({
        where: {
          subscriberId_expertProfileId_month: {
            subscriberId: session.user.id,
            expertProfileId: expertProfile.id,
            month: monthKey,
          },
        },
      });

      const questionsUsed = monthlyUsage?.questionCount ?? 0;

      return NextResponse.json({
        questionsUsed,
        questionsAllowed: monthlyLimit ?? -1, // -1 signals unlimited
        hasSubscription: true,
        hasTrialAccess: monthlyLimit === null || questionsUsed < monthlyLimit,
        tier: subscription.tier,
        isUnlimited: monthlyLimit === null,
      });
    }

    // Check trial access
    const trial = await checkTrialAccess(session.user.id, expertProfile.id);

    return NextResponse.json({
      questionsUsed: trial.used,
      questionsAllowed: trial.limit,
      hasSubscription: false,
      hasTrialAccess: trial.allowed,
      tier: null,
      isUnlimited: false,
    });
  } catch (error) {
    console.error("Trial status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
