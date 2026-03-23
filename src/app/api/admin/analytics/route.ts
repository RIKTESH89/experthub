import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [
      totalUsers,
      activeExperts,
      totalSubscribers,
      totalPosts,
      activeSubscriptions,
      recentSignups,
      recentPosts,
      subscriptionRevenue,
      prevUsers,
      prevExperts,
      prevSubscriptions,
      prevPosts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "EXPERT", isActive: true } }),
      prisma.user.count({ where: { role: "SUBSCRIBER" } }),
      prisma.post.count(),
      prisma.expertSubscription.count({ where: { status: "ACTIVE" } }),
      prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.post.groupBy({
        by: ["createdAt"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: true,
        orderBy: { createdAt: "asc" },
      }),
      prisma.expertSubscription.aggregate({
        where: { status: "ACTIVE" },
        _sum: { price: true },
      }),
      // Previous period counts for trends
      prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.user.count({ where: { role: "EXPERT", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.expertSubscription.count({ where: { status: "ACTIVE", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.post.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    ]);

    const recentUserCount = await prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
    const recentPostCount = await prisma.post.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
    const recentSubCount = await prisma.expertSubscription.count({ where: { createdAt: { gte: thirtyDaysAgo } } });

    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return { direction: "neutral" as const, percentage: 0 };
      const pct = Math.round(((current - previous) / previous) * 100);
      return {
        direction: pct > 0 ? ("up" as const) : pct < 0 ? ("down" as const) : ("neutral" as const),
        percentage: Math.abs(pct),
      };
    };

    // Aggregate posts per day
    const postsPerDay: Record<string, number> = {};
    for (const entry of recentPosts) {
      const day = entry.createdAt.toISOString().split("T")[0];
      postsPerDay[day] = (postsPerDay[day] || 0) + entry._count;
    }

    return NextResponse.json({
      totalUsers,
      activeExperts,
      activeSubscriptions,
      totalPosts,
      totalSubscribers,
      trends: {
        users: calcTrend(recentUserCount, prevUsers),
        experts: calcTrend(activeExperts, prevExperts),
        subscriptions: calcTrend(recentSubCount, prevSubscriptions),
        posts: calcTrend(recentPostCount, prevPosts),
      },
      recentSignups,
      postsPerDay,
      subscriptionRevenue: subscriptionRevenue._sum.price || 0,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
