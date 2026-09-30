import { readablePostsWhere } from "@/lib/knowledge/post-access";
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
    const sort = searchParams.get("sort") === "oldest" ? "asc" as const : "desc" as const;
    const skip = (page - 1) * limit;

    // Get bookmarked post IDs
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: session.user.id },
      select: { postId: true },
      orderBy: { createdAt: sort },
      skip,
      take: limit,
    });

    const totalBookmarks = await prisma.bookmark.count({
      where: { userId: session.user.id },
    });

    const postIds = bookmarks.map((b) => b.postId);

    if (postIds.length === 0) {
      return NextResponse.json({
        posts: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    const posts = await prisma.post.findMany({
      where: { id: { in: postIds }, AND: [readablePostsWhere(session.user.id)] },
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
      },
    });

    // Maintain bookmark order
    const formattedPosts = posts.map((post) => ({
      ...post,
      tags: post.tags.map((pt) => pt.tag.name),
    }));
    const postMap = new Map(formattedPosts.map((p) => [p.id, p]));
    const orderedPosts = postIds
      .map((id) => postMap.get(id))
      .filter(Boolean);

    return NextResponse.json({
      posts: orderedPosts,
      pagination: {
        page,
        limit,
        total: totalBookmarks,
        totalPages: Math.ceil(totalBookmarks / limit),
      },
    });
  } catch (error) {
    console.error("Subscriber bookmarks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
