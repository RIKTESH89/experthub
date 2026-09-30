import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { parsePdfContent } from "@/lib/import/pdf-parser";
import { syncKnowledgeItem } from "@/lib/knowledge/lifecycle";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can import content" },
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const fileName = file.name || "upload.pdf";

    // Create ImportJob with status PROCESSING
    const importJob = await prisma.importJob.create({
      data: {
        expertProfileId: expertProfile.id,
        sourceType: "PDF",
        fileName,
        status: "PROCESSING",
      },
    });

    try {
      // Read file buffer from FormData
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Parse PDF content
      const { title, content, numPages } = await parsePdfContent(buffer);

      // Create KnowledgeItem
      const knowledgeItem = await prisma.knowledgeItem.create({
        data: {
          expertProfileId: expertProfile.id,
          title,
          content,
          sourceType: "pdf",
          metadata: { fileName, numPages },
        },
      });

      await syncKnowledgeItem(expertProfile.id, knowledgeItem.id);

      // Update ImportJob status to COMPLETED
      await prisma.importJob.update({
        where: { id: importJob.id },
        data: { status: "COMPLETED", itemsCreated: 1 },
      });

      return NextResponse.json({
        status: "success",
        title,
        fileName,
        numPages,
        knowledgeItemId: knowledgeItem.id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update ImportJob status to FAILED
      await prisma.importJob.update({
        where: { id: importJob.id },
        data: { status: "FAILED", errorMessage },
      });

      return NextResponse.json(
        { error: errorMessage },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error("PDF import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
