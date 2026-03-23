import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { indexDocument, removeDocument } from "@/lib/vector/indexer";

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

    if (newRagState) {
      // Enabling RAG - create knowledge item and index
      const content = `${post.title || ""}\n\n${post.content || ""}`;
      const vectorIds = await indexDocument(
        expertProfile.vectorNamespace,
        post.id,
        content,
        { sourceType: "post", postId: post.id }
      );

      await prisma.knowledgeItem.create({
        data: {
          expertProfileId: expertProfile.id,
          title: post.title || "Untitled Post",
          content,
          sourceType: "post",
          sourceId: post.id,
          isIndexed: true,
          vectorIds,
        },
      });
    } else {
      // Disabling RAG - remove from vector store
      const knowledgeItem = await prisma.knowledgeItem.findFirst({
        where: { sourceId: postId, sourceType: "post" },
      });

      if (knowledgeItem && knowledgeItem.vectorIds.length > 0) {
        await removeDocument(
          expertProfile.vectorNamespace,
          knowledgeItem.vectorIds
        );
        await prisma.knowledgeItem.delete({
          where: { id: knowledgeItem.id },
        });
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { isRagEnabled: newRagState },
    });

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
