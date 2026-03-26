import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    // Get expert profile IDs the user is subscribed to
    const subscriptions = await prisma.expertSubscription.findMany({
      where: {
        subscriberId: session.user.id,
        status: "ACTIVE",
      },
      select: { expertProfile: { select: { userId: true } } },
    });

    const subscribedExpertUserIds = subscriptions.map(
      (s) => s.expertProfile.userId
    );

    // If not subscribed to anyone, return empty feed
    if (subscribedExpertUserIds.length === 0) {
      return NextResponse.json({
        posts: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    const where = {
      authorId: { in: subscribedExpertUserIds },
      status: "PUBLISHED" as const,
      isHidden: false,
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              expertProfile: {
                select: { displayName: true, isVerified: true },
              },
            },
          },
          media: true,
          tags: { include: { tag: true } },
          _count: { select: { likes: true, comments: true, bookmarks: true } },
          likes: {
            where: { userId: session.user.id },
            select: { id: true },
          },
          bookmarks: {
            where: { userId: session.user.id },
            select: { id: true },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    const formattedPosts = posts.map((post) => ({
      ...post,
      tags: post.tags.map((pt) => pt.tag.name),
      isLiked: (post as unknown as { likes: unknown[] }).likes?.length > 0,
      isBookmarked: (post as unknown as { bookmarks: unknown[] }).bookmarks?.length > 0,
      likes: undefined,
      bookmarks: undefined,
    }));

    return NextResponse.json({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Subscriber feed error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
