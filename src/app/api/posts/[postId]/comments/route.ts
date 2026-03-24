import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required"),
  parentId: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
            replies: {
              include: {
                user: {
                  select: { id: true, name: true, image: true },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("List comments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = createCommentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { content, parentId } = validation.data;

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId: session.user.id,
        postId,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Create notification for post author
    if (post.authorId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          title: "New Comment",
          message: `${session.user.name || "Someone"} commented on your post`,
          link: `/posts/${postId}`,
        },
      });

      // Fire-and-forget email notification
      sendNotificationEmail({
        type: "new_comment",
        recipientUserId: post.authorId,
        data: {
          commenterName: session.user.name || "Someone",
          postTitle: post.title || "Untitled Post",
          postId: postId,
        },
      }).catch(() => {});
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
