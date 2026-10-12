import { withKnowledgeWrite } from "@/lib/knowledge/lifecycle";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { syncKnowledgeItem, removeKnowledgeItem } from "@/lib/knowledge/lifecycle";
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

    // Linked posts have their own authoritative lifecycle; do not fork their copied source.
    if (knowledgeItem.sourceType === "post") {
      return NextResponse.json({ error: "Edit the original post" }, { status: 409 });
    }
    const changed = (title !== undefined && title !== knowledgeItem.title) ||
      (content !== undefined && content !== knowledgeItem.content) || metadata !== undefined;
    const updatedItem = changed ? await withKnowledgeWrite(knowledgeItem.expertProfileId, tx => tx.knowledgeItem.update({
      where: { id: itemId },
      data: { ...updateData, sourceVersion: { increment: 1 }, isIndexed: false, indexingError: null },
    })) : knowledgeItem;
    const indexedItem = await syncKnowledgeItem(knowledgeItem.expertProfileId, itemId);

    return NextResponse.json(indexedItem || updatedItem);
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

    await removeKnowledgeItem(knowledgeItem.expertProfileId, itemId);

    return NextResponse.json({ message: "Knowledge item deleted successfully" });
  } catch (error) {
    console.error("Delete knowledge item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
