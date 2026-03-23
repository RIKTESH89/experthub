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

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: { userId: session.user.id, postId },
      },
    });

    let isBookmarked: boolean;

    if (existingBookmark) {
      await prisma.bookmark.delete({ where: { id: existingBookmark.id } });
      isBookmarked = false;
    } else {
      await prisma.bookmark.create({
        data: {
          userId: session.user.id,
          postId,
        },
      });
      isBookmarked = true;
    }

    const bookmarkCount = await prisma.bookmark.count({ where: { postId } });

    return NextResponse.json({ isBookmarked, bookmarkCount });
  } catch (error) {
    console.error("Toggle bookmark error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
