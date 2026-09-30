import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { syncPostSource } from "@/lib/knowledge/lifecycle";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can toggle RAG" },
        { status: 403 }
      );
    }

    const { postId } = await params;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the author can toggle RAG for this post" },
        { status: 403 }
      );
    }

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert profile not found" },
        { status: 404 }
      );
    }

    const newRagState = !post.isRagEnabled;

    const updatedPost = await prisma.post.update({
      where: { id: postId }, data: { isRagEnabled: newRagState },
    });
    await syncPostSource(postId);

    return NextResponse.json({
      isRagEnabled: updatedPost.isRagEnabled,
      message: newRagState
        ? "Post added to knowledge base"
        : "Post removed from knowledge base",
    });
  } catch (error) {
    console.error("RAG toggle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
