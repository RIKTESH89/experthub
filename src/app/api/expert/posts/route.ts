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
        { error: "Only experts can access this resource" },
        { status: 403 }
      );
    }

    const posts = await prisma.post.findMany({
      where: { authorId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        isRagEnabled: true,
        viewCount: true,
        createdAt: true,
        tags: {
          select: {
            tag: {
              select: { name: true },
            },
          },
        },
        media: {
          select: {
            id: true,
            type: true,
            url: true,
            thumbnail: true,
            order: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true,
          },
        },
      },
    });

    // Transform to match the ExpertPost interface expected by the frontend
    const result = posts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content ?? "",
      status: post.status,
      isRagEnabled: post.isRagEnabled,
      createdAt: post.createdAt,
      tags: post.tags.map((pt) => pt.tag.name),
      media: post.media,
      _count: {
        likes: post._count.likes,
        comments: post._count.comments,
        views: post.viewCount,
      },
    }));

    return NextResponse.json({ posts: result });
  } catch (error) {
    console.error("Get expert posts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
