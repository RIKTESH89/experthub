import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { removeDocument } from "@/lib/vector/indexer";
import { createPostSchema } from "@/lib/validations/post";

const updatePostSchema = createPostSchema.partial();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
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
        comments: {
          where: { parentId: null },
          include: {
            user: { select: { id: true, name: true, image: true } },
            replies: {
              include: {
                user: { select: { id: true, name: true, image: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
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

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Increment view count
    await prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });

    // Check if current user liked/bookmarked
    const session = await auth();
    let isLiked = false;
    let isBookmarked = false;

    if (session?.user?.id) {
      const [like, bookmark] = await Promise.all([
        prisma.like.findUnique({
          where: { userId_postId: { userId: session.user.id, postId } },
        }),
        prisma.bookmark.findUnique({
          where: { userId_postId: { userId: session.user.id, postId } },
        }),
      ]);
      isLiked = !!like;
      isBookmarked = !!bookmark;
    }

    return NextResponse.json({
      ...post,
      tags: post.tags.map((pt) => pt.tag.name),
      viewCount: post.viewCount + 1,
      isLiked,
      isBookmarked,
    });
  } catch (error) {
    console.error("Get post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the author can update this post" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updatePostSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { tags, media, ...updateData } = validation.data;

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        ...updateData,
        ...(media && {
          media: {
            deleteMany: {},
            create: media,
          },
        }),
        ...(tags && {
          tags: {
            deleteMany: {},
            create: await Promise.all(
              tags.map(async (tagName: string) => {
                const slug = tagName.toLowerCase().replace(/\s+/g, "-");
                const tag = await prisma.tag.upsert({
                  where: { slug },
                  create: { name: tagName, slug },
                  update: {},
                });
                return { tagId: tag.id };
              })
            ),
          },
        }),
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
        media: true,
        tags: { include: { tag: true } },
        _count: {
          select: { likes: true, comments: true, bookmarks: true },
        },
      },
    });

    return NextResponse.json({
      ...post,
      tags: post.tags.map((pt) => pt.tag.name),
    });
  } catch (error) {
    console.error("Update post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isAuthor = post.authorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "Only the author or an admin can delete this post" },
        { status: 403 }
      );
    }

    // Remove from vector store if indexed
    if (post.isRagEnabled) {
      const knowledgeItem = await prisma.knowledgeItem.findFirst({
        where: { sourceId: postId, sourceType: "post" },
      });

      if (knowledgeItem && knowledgeItem.vectorIds.length > 0) {
        const expertProfile = await prisma.expertProfile.findUnique({
          where: { userId: post.authorId },
        });

        if (expertProfile) {
          await removeDocument(
            expertProfile.vectorNamespace,
            knowledgeItem.vectorIds
          );
        }

        await prisma.knowledgeItem.delete({
          where: { id: knowledgeItem.id },
        });
      }
    }

    await prisma.post.delete({ where: { id: postId } });

    return NextResponse.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
