import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createKnowledgeSchema } from "@/lib/validations/knowledge";
import { syncKnowledgeItem } from "@/lib/knowledge/lifecycle";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can access knowledge items" },
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

    const knowledgeItems = await prisma.knowledgeItem.findMany({
      where: { expertProfileId: expertProfile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(knowledgeItems);
  } catch (error) {
    console.error("List knowledge error:", error);
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
        { error: "Only experts can create knowledge items" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createKnowledgeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
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

    const { title, content, sourceType, metadata } = validation.data;

    const knowledgeItem = await prisma.knowledgeItem.create({
      data: {
        expertProfileId: expertProfile.id,
        title,
        content,
        sourceType,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });

    const updatedItem = await syncKnowledgeItem(expertProfile.id, knowledgeItem.id);

    return NextResponse.json(updatedItem, { status: 201 });
  } catch (error) {
    console.error("Create knowledge error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
