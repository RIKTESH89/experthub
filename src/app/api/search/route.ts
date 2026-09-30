import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const query = q.trim();

    const [experts, tags, posts] = await Promise.all([
      // Search experts
      prisma.user.findMany({
        where: {
          role: "EXPERT",
          isActive: true,
          isBanned: false,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            {
              expertProfile: {
                OR: [
                  { displayName: { contains: query, mode: "insensitive" } },
                  { specialty: { has: query } },
                ],
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          image: true,
          expertProfile: {
            select: {
              displayName: true,
              specialty: true,
              isVerified: true,
              totalSubscribers: true,
            },
          },
        },
        take: 10,
      }),

      // Search tags
      prisma.tag.findMany({
        where: {
          name: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          postCount: true,
        },
        take: 10,
        orderBy: { postCount: "desc" },
      }),

      // Search posts
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          isHidden: false,
          isPremiumOnly: false,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      experts,
      tags,
      posts: posts.map((post: typeof posts[number]) => ({
        ...post,
        content: post.content
          ? post.content.substring(0, 200) + (post.content.length > 200 ? "..." : "")
          : null,
      })),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
