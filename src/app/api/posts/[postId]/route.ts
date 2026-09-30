import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { syncPostSource, removePostSource } from "@/lib/knowledge/lifecycle";
import { createPostSchema } from "@/lib/validations/post";
import { canReadPost } from "@/lib/knowledge/post-access";
import crypto from "crypto";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

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

    // Check if current user liked/bookmarked
    const session = await auth();
    if (!await canReadPost(post, session?.user?.id)) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
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

    // Track deduplicated view (fire-and-forget — don't block response)
    const userId = session?.user?.id ?? null;
    const isAuthor = userId === post.authorId;

    if (!isAuthor) {
      // Generate IP hash for anonymous dedup (logged-out users)
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() || "unknown";
      const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Check if this user/ip already viewed this post in last 24 hours
      const existingView = await prisma.postView.findFirst({
        where: {
          postId,
          viewedAt: { gte: twentyFourHoursAgo },
          ...(userId ? { userId } : { ipHash }),
        },
      });

      if (!existingView) {
        // New unique view — record it and increment count
        prisma.postView.create({
          data: {
            postId,
            userId,
            ipHash: userId ? null : ipHash,
          },
        }).then(() => {
          return prisma.post.update({
            where: { id: postId },
            data: { viewCount: { increment: 1 } },
          });
        }).catch(() => {}); // fire-and-forget
      }
    }

    return NextResponse.json({
      ...post,
      tags: post.tags.map((pt) => pt.tag.name),
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

    await syncPostSource(postId);

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

    await removePostSource(postId, post.authorId);

    // Delete media files from S3 (fire-and-forget)
    const mediaItems = await prisma.postMedia.findMany({
      where: { postId },
      select: { url: true },
    });

    if (mediaItems && mediaItems.length > 0 && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      const bucket = process.env.AWS_S3_BUCKET || "experthub-uploads";
      const region = process.env.AWS_REGION || "ap-south-1";
      const bucketUrl = `https://${bucket}.s3.${region}.amazonaws.com/`;

      // Extract S3 keys from URLs (only for files actually on S3)
      const s3Keys = mediaItems
        .filter((m) => m.url.startsWith(bucketUrl))
        .map((m) => ({ Key: m.url.replace(bucketUrl, "") }));

      if (s3Keys.length > 0) {
        try {
          const s3 = new S3Client({
            region,
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
          });
          await s3.send(new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: s3Keys },
          }));
        } catch (s3Error) {
          // Log but don't block post deletion if S3 cleanup fails
          console.error("Failed to delete media from S3:", s3Error);
        }
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
