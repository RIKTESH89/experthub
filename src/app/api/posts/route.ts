import { readablePostsWhere } from "@/lib/knowledge/post-access";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createPostSchema } from "@/lib/validations/post";
import { withPostOutbox, syncPostSource } from "@/lib/knowledge/lifecycle";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);

    const authorId = searchParams.get("authorId");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search");
    const skip = (page - 1) * limit;

    const isOwnPosts = session?.user?.id === authorId;
    const isAdmin = false; // Restricted sources remain owner-only.

    const where: Record<string, unknown> = { AND: [readablePostsWhere(session?.user?.id)] };

    if (authorId) {
      where.authorId = authorId;
    }

    if (status && (isOwnPosts || isAdmin)) {
      where.status = status;
    } else if (!isOwnPosts && !isAdmin) {
      where.status = "PUBLISHED";
      where.isHidden = false;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

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
      }),
      prisma.post.count({ where }),
    ]);

    const formattedPosts = posts.map((post: typeof posts[number]) => ({
      ...post,
      tags: post.tags.map((pt) => pt.tag.name),
      isLiked: Array.isArray((post as Record<string, unknown>).likes) && ((post as Record<string, unknown>).likes as unknown[]).length > 0,
      isBookmarked: Array.isArray((post as Record<string, unknown>).bookmarks) && ((post as Record<string, unknown>).bookmarks as unknown[]).length > 0,
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
    console.error("List posts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can create posts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createPostSchema.safeParse(body);

    if (!validation.success) {
      console.error("Post validation failed:", JSON.stringify(validation.error.issues ?? validation.error, null, 2));
      console.error("Request body:", JSON.stringify(body));
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues ?? validation.error },
        { status: 400 }
      );
    }

    const { tags, media, ...postData } = validation.data;

    // Upsert tags
    const tagRecords = await Promise.all(
      tags.map(async (tagName: string) => {
        const slug = tagName.toLowerCase().replace(/\s+/g, "-");
        return prisma.tag.upsert({
          where: { slug },
          create: { name: tagName, slug },
          update: { postCount: { increment: 1 } },
        });
      })
    );

    const post = await withPostOutbox(session.user.id, async (tx) => tx.post.create({
      data: {
        ...postData,
        authorId: session.user.id,
        media: {
          create: media,
        },
        tags: {
          create: tagRecords.map((tag) => ({
            tagId: tag.id,
          })),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            expertProfile: true,
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
      },
    }));

    if (postData.isRagEnabled) await syncPostSource(post.id);

    const formattedPost = {
      ...post,
      tags: post.tags.map((pt) => pt.tag.name),
    };

    return NextResponse.json(formattedPost, { status: 201 });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
