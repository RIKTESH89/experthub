import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  DEFAULT_TIER_PRICES,
  TIER_DESCRIPTIONS,
  DEFAULT_FREE_QUESTIONS,
  ACTIVE_TIERS,
} from "@/lib/constants";

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

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: expertId },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert not found" },
        { status: 404 }
      );
    }

    let tiers = await prisma.expertPricingTier.findMany({
      where: { expertProfileId: expertProfile.id, isActive: true },
      orderBy: { price: "asc" },
    });

    // Return defaults if none exist
    if (tiers.length === 0) {
      const defaults = [
        {
          expertProfileId: expertProfile.id,
          tier: "FREE" as const,
          price: DEFAULT_TIER_PRICES.FREE,
          description: TIER_DESCRIPTIONS.FREE,
          monthlyQuestions: DEFAULT_FREE_QUESTIONS,
          features: [
            "Access to all public posts",
            `${DEFAULT_FREE_QUESTIONS} Digital Twin questions/month`,
          ],
        },
        {
          expertProfileId: expertProfile.id,
          tier: "PREMIUM" as const,
          price: DEFAULT_TIER_PRICES.PREMIUM,
          description: TIER_DESCRIPTIONS.PREMIUM,
          monthlyQuestions: null,
          features: [
            "Access to all posts including exclusive content",
            "Unlimited Digital Twin questions",
            "Priority support",
          ],
        },
      ];

      for (const d of defaults) {
        await prisma.expertPricingTier.create({ data: d });
      }

      tiers = await prisma.expertPricingTier.findMany({
        where: { expertProfileId: expertProfile.id, isActive: true },
        orderBy: { price: "asc" },
      });
    }

    // Filter to active tiers only
    const activeTiers = tiers.filter((t) => ACTIVE_TIERS.includes(t.tier));

    return NextResponse.json({ tiers: activeTiers });
  } catch (error) {
    console.error("Get expert pricing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
