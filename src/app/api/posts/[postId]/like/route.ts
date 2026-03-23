import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: { userId: session.user.id, postId },
      },
    });

    let isLiked: boolean;

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      isLiked = false;
    } else {
      await prisma.like.create({
        data: {
          userId: session.user.id,
          postId,
        },
      });
      isLiked = true;
    }

    const likeCount = await prisma.like.count({ where: { postId } });

    return NextResponse.json({ isLiked, likeCount });
  } catch (error) {
    console.error("Toggle like error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
