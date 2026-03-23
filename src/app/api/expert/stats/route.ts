import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can access stats" },
        { status: 403 }
      );
    }

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, totalSubscribers: true },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert profile not found" },
        { status: 404 }
      );
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Current period stats
    const [totalPosts, recentPosts, totalViews, recentLikes, recentComments] =
      await Promise.all([
        prisma.post.count({
          where: { authorId: session.user.id },
        }),
        prisma.post.count({
          where: {
            authorId: session.user.id,
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        prisma.post
          .aggregate({
            where: { authorId: session.user.id },
            _sum: { viewCount: true },
          })
          .then((r) => r._sum.viewCount || 0),
        prisma.like.count({
          where: {
            post: { authorId: session.user.id },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        prisma.comment.count({
          where: {
            post: { authorId: session.user.id },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
      ]);

    // Previous period stats for trend calculation
    const [prevPosts, prevLikes, prevComments] = await Promise.all([
      prisma.post.count({
        where: {
          authorId: session.user.id,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
      prisma.like.count({
        where: {
          post: { authorId: session.user.id },
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
      prisma.comment.count({
        where: {
          post: { authorId: session.user.id },
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
    ]);

    const currentEngagement =
      totalPosts > 0
        ? ((recentLikes + recentComments) / totalPosts) * 100
        : 0;
    const prevEngagement =
      prevPosts > 0 ? ((prevLikes + prevComments) / prevPosts) * 100 : 0;

    const calcTrend = (current: number, previous: number) => {
      if (previous === 0)
        return { direction: "neutral" as const, percentage: 0 };
      const pct = Math.round(((current - previous) / previous) * 100);
      return {
        direction: pct > 0 ? ("up" as const) : pct < 0 ? ("down" as const) : ("neutral" as const),
        percentage: Math.abs(pct),
      };
    };

    return NextResponse.json({
      totalSubscribers: expertProfile.totalSubscribers,
      totalPosts,
      totalViews,
      engagementRate: Math.round(currentEngagement * 10) / 10,
      trends: {
        subscribers: { direction: "neutral" as const, percentage: 0 },
        posts: calcTrend(recentPosts, prevPosts),
        views: { direction: "neutral" as const, percentage: 0 },
        engagement: calcTrend(currentEngagement, prevEngagement),
      },
    });
  } catch (error) {
    console.error("Expert stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
