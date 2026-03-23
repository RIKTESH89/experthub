import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const experts = await prisma.user.findMany({
      where: {
        role: "EXPERT",
        isActive: true,
        isBanned: false,
        expertProfile: { isNot: null },
      },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        headline: true,
        expertProfile: {
          select: {
            id: true,
            displayName: true,
            specialty: true,
            monthlyPrice: true,
            isVerified: true,
            totalSubscribers: true,
            twinGreeting: true,
          },
        },
        posts: {
          where: {
            status: "PUBLISHED",
            createdAt: { gte: sevenDaysAgo },
          },
          select: {
            _count: {
              select: { likes: true, comments: true },
            },
            viewCount: true,
          },
        },
        _count: {
          select: { posts: true },
        },
      },
      take: 50,
    });

    // Calculate engagement score and sort
    const scoredExperts = experts
      .map((expert: typeof experts[number]) => {
        const recentEngagement = expert.posts.reduce(
          (total: number, post: typeof expert.posts[number]) =>
            total +
            post.viewCount +
            post._count.likes * 3 +
            post._count.comments * 2,
          0
        );

        return {
          ...expert,
          posts: undefined,
          engagementScore:
            (expert.expertProfile?.totalSubscribers || 0) * 5 +
            recentEngagement,
        };
      })
      .sort((a: { engagementScore: number }, b: { engagementScore: number }) => b.engagementScore - a.engagementScore)
      .slice(0, 10);

    return NextResponse.json(scoredExperts);
  } catch (error) {
    console.error("Trending experts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
