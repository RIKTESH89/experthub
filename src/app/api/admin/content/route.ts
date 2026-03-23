import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      if (status === "REMOVED") {
        where.isHidden = true;
      } else {
        where.status = status;
        where.isHidden = false;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { author: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          content: true,
          status: true,
          isHidden: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    // Map posts to include a virtual "REMOVED" status for hidden posts
    // and add reports count via a separate query
    const postIds = posts.map((p) => p.id);

    const reportCounts = await prisma.report.groupBy({
      by: ["contentId"],
      where: {
        contentId: { in: postIds },
        contentType: "post",
      },
      _count: { id: true },
    });

    const reportMap = new Map(
      reportCounts.map((r) => [r.contentId, r._count.id])
    );

    const mappedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content || "",
      status: post.isHidden ? "REMOVED" : post.status,
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        name: post.author.name || "Unknown",
        image: post.author.image,
      },
      _count: {
        likes: post._count.likes,
        comments: post._count.comments,
        reports: reportMap.get(post.id) || 0,
      },
    }));

    return NextResponse.json({
      posts: mappedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin content list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
