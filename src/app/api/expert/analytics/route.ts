import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function getPeriodDays(period: string): number {
  switch (period) {
    case "7d": return 7;
    case "90d": return 90;
    default: return 30;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "EXPERT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, userId: true },
    });

    if (!expertProfile) {
      return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });
    }

    const period = request.nextUrl.searchParams.get("period") || "30d";
    const days = getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Run all queries in parallel
    const [
      totalSubscribers,
      activeSubscribers,
      totalRevenueResult,
      periodRevenueResult,
      totalTwinQuestions,
      periodTwinQuestions,
      avgQualityResult,
      subscriberGrowthRaw,
      revenueOverTimeRaw,
      twinUsageRaw,
      contentPerformance,
    ] = await Promise.all([
      // Total subscribers
      prisma.expertSubscription.count({
        where: { expertProfileId: expertProfile.id },
      }),
      // Active subscribers
      prisma.expertSubscription.count({
        where: { expertProfileId: expertProfile.id, status: "ACTIVE" },
      }),
      // Total revenue
      prisma.expertSubscription.aggregate({
        where: { expertProfileId: expertProfile.id },
        _sum: { price: true },
      }),
      // Period revenue
      prisma.expertSubscription.aggregate({
        where: {
          expertProfileId: expertProfile.id,
          createdAt: { gte: startDate },
        },
        _sum: { price: true },
      }),
      // Total twin questions
      prisma.twinInteraction.count({
        where: { expertProfileId: expertProfile.id },
      }),
      // Period twin questions
      prisma.twinInteraction.count({
        where: {
          expertProfileId: expertProfile.id,
          createdAt: { gte: startDate },
        },
      }),
      // Avg answer quality
      prisma.twinInteraction.aggregate({
        where: {
          expertProfileId: expertProfile.id,
          answerQuality: { not: null },
        },
        _avg: { answerQuality: true },
      }),
      // Subscriber growth by day
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
        FROM "ExpertSubscription"
        WHERE "expertProfileId" = ${expertProfile.id}
          AND "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      // Revenue over time by day
      prisma.$queryRaw<{ date: string; amount: number }[]>`
        SELECT DATE("createdAt") as date, SUM(price)::float as amount
        FROM "ExpertSubscription"
        WHERE "expertProfileId" = ${expertProfile.id}
          AND "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      // Twin usage by day
      prisma.$queryRaw<{ date: string; questions: bigint }[]>`
        SELECT DATE("createdAt") as date, COUNT(*)::bigint as questions
        FROM "TwinInteraction"
        WHERE "expertProfileId" = ${expertProfile.id}
          AND "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      // Top 10 posts by views
      prisma.post.findMany({
        where: { authorId: expertProfile.userId },
        orderBy: { viewCount: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          viewCount: true,
          createdAt: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      overview: {
        totalSubscribers,
        activeSubscribers,
        totalRevenue: totalRevenueResult._sum.price || 0,
        periodRevenue: periodRevenueResult._sum.price || 0,
        totalTwinQuestions,
        periodTwinQuestions,
        avgAnswerQuality: avgQualityResult._avg.answerQuality || 0,
      },
      subscriberGrowth: subscriberGrowthRaw.map((r) => ({
        date: String(r.date),
        count: Number(r.count),
      })),
      revenueOverTime: revenueOverTimeRaw.map((r) => ({
        date: String(r.date),
        amount: Number(r.amount),
      })),
      twinUsage: twinUsageRaw.map((r) => ({
        date: String(r.date),
        questions: Number(r.questions),
      })),
      contentPerformance: contentPerformance.map((p) => ({
        id: p.id,
        title: p.title || "Untitled",
        views: p.viewCount,
        likes: p._count.likes,
        comments: p._count.comments,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
