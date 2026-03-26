import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  DEFAULT_TIER_PRICES,
  TIER_DESCRIPTIONS,
  DEFAULT_FREE_QUESTIONS,
  ACTIVE_TIERS,
} from "@/lib/constants";

const updatePricingSchema = z.object({
  tiers: z.array(
    z.object({
      tier: z.enum(["FREE", "STANDARD", "PREMIUM"]),
      price: z.number().min(0),
      description: z.string().optional(),
      monthlyQuestions: z.number().int().min(1).optional().nullable(),
      features: z.array(z.string()).optional(),
    })
  ),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can access this resource" },
        { status: 403 }
      );
    }

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert profile not found" },
        { status: 404 }
      );
    }

    let tiers = await prisma.expertPricingTier.findMany({
      where: { expertProfileId: expertProfile.id },
      orderBy: { price: "asc" },
    });

    // Create defaults if none exist
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
        where: { expertProfileId: expertProfile.id },
        orderBy: { price: "asc" },
      });
    }

    // Filter to active tiers only
    const activeTiers = tiers.filter((t) => ACTIVE_TIERS.includes(t.tier));

    return NextResponse.json({ tiers: activeTiers });
  } catch (error) {
    console.error("Get pricing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can access this resource" },
        { status: 403 }
      );
    }

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updatePricingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tiers } = parsed.data;

    for (const t of tiers) {
      await prisma.expertPricingTier.upsert({
        where: {
          expertProfileId_tier: {
            expertProfileId: expertProfile.id,
            tier: t.tier,
          },
        },
        update: {
          price: t.tier === "FREE" ? 0 : t.price,
          description: t.description,
          monthlyQuestions: t.monthlyQuestions,
          features: t.features ?? [],
        },
        create: {
          expertProfileId: expertProfile.id,
          tier: t.tier,
          price: t.tier === "FREE" ? 0 : t.price,
          description: t.description,
          monthlyQuestions: t.monthlyQuestions,
          features: t.features ?? [],
        },
      });
    }

    const updatedTiers = await prisma.expertPricingTier.findMany({
      where: { expertProfileId: expertProfile.id },
      orderBy: { price: "asc" },
    });

    const activeUpdated = updatedTiers.filter((t) => ACTIVE_TIERS.includes(t.tier));

    return NextResponse.json({ tiers: activeUpdated });
  } catch (error) {
    console.error("Update pricing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
