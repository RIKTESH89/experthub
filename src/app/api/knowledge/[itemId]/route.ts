import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { indexDocument, removeDocument } from "@/lib/vector/indexer";
import { z } from "zod";

const updateKnowledgeItemSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;

    const knowledgeItem = await prisma.knowledgeItem.findUnique({
      where: { id: itemId },
      include: { expertProfile: true },
    });

    if (!knowledgeItem) {
      return NextResponse.json(
        { error: "Knowledge item not found" },
        { status: 404 }
      );
    }

    if (!knowledgeItem.expertProfile || knowledgeItem.expertProfile.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(knowledgeItem);
  } catch (error) {
    console.error("Get knowledge item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;

    const knowledgeItem = await prisma.knowledgeItem.findUnique({
      where: { id: itemId },
      include: { expertProfile: true },
    });

    if (!knowledgeItem) {
      return NextResponse.json(
        { error: "Knowledge item not found" },
        { status: 404 }
      );
    }

    if (!knowledgeItem.expertProfile || knowledgeItem.expertProfile.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateKnowledgeItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { title, content, metadata } = validation.data;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (metadata !== undefined) updateData.metadata = metadata;

    const updatedItem = await prisma.knowledgeItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Re-index if content changed
    if (content !== undefined && content !== knowledgeItem.content) {
      // Remove old vectors
      if (knowledgeItem.vectorIds.length > 0) {
        await removeDocument(
          knowledgeItem.expertProfile.vectorNamespace,
          knowledgeItem.vectorIds
        );
      }

      // Index new content
      const vectorIds = await indexDocument(
        knowledgeItem.expertProfile.vectorNamespace,
        itemId,
        `${updatedItem.title}\n\n${content}`,
        {
          sourceType: updatedItem.sourceType,
          knowledgeItemId: itemId,
        }
      );

      await prisma.knowledgeItem.update({
        where: { id: itemId },
        data: { isIndexed: true, vectorIds },
      });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Update knowledge item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;

    const knowledgeItem = await prisma.knowledgeItem.findUnique({
      where: { id: itemId },
      include: { expertProfile: true },
    });

    if (!knowledgeItem) {
      return NextResponse.json(
        { error: "Knowledge item not found" },
        { status: 404 }
      );
    }

    if (!knowledgeItem.expertProfile || knowledgeItem.expertProfile.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove from vector store
    if (knowledgeItem.vectorIds.length > 0) {
      await removeDocument(
        knowledgeItem.expertProfile.vectorNamespace,
        knowledgeItem.vectorIds
      );
    }

    await prisma.knowledgeItem.delete({ where: { id: itemId } });

    return NextResponse.json({ message: "Knowledge item deleted successfully" });
  } catch (error) {
    console.error("Delete knowledge item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
