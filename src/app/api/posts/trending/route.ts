import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const limit = Math.min(20, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "20")));
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        isHidden: false,
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            expertProfile: {
              select: {
                displayName: true,
                specialty: true,
                isVerified: true,
              },
            },
          },
        },
        media: true,
        tags: { include: { tag: true } },
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true,
          },
        },
        ...(session?.user?.id
          ? {
              likes: {
                where: { userId: session.user.id },
                select: { id: true },
              },
              bookmarks: {
                where: { userId: session.user.id },
                select: { id: true },
              },
            }
          : {}),
      },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: 20,
    });

    // Sort by combined engagement score
    const scoredPosts = posts
      .map((post: typeof posts[number]) => ({
        ...post,
        tags: post.tags.map((pt) => pt.tag.name),
        isLiked: Array.isArray((post as Record<string, unknown>).likes) && ((post as Record<string, unknown>).likes as unknown[]).length > 0,
        isBookmarked: Array.isArray((post as Record<string, unknown>).bookmarks) && ((post as Record<string, unknown>).bookmarks as unknown[]).length > 0,
        likes: undefined,
        bookmarks: undefined,
        engagementScore:
          post.viewCount + post._count.likes * 3 + post._count.comments * 2,
      }))
      .sort((a: { engagementScore: number }, b: { engagementScore: number }) => b.engagementScore - a.engagementScore)
      .slice(0, limit);

    return NextResponse.json(scoredPosts);
  } catch (error) {
    console.error("Trending posts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
