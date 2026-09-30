import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { scrapeBlogContent } from "@/lib/import/blog-scraper";

import { syncKnowledgeItem } from "@/lib/knowledge/lifecycle";

const blogImportSchema = z.object({
  urls: z
    .array(z.string().url("Each entry must be a valid URL"))
    .min(1, "At least one URL is required")
    .max(20, "Maximum 20 URLs per import"),
});

interface ImportResult {
  url: string;
  status: "success" | "error";
  title?: string;
  error?: string;
}

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

    const body = await request.json();
    const validation = blogImportSchema.safeParse(body);

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

    const { urls } = validation.data;
    const results: ImportResult[] = [];

    for (const url of urls) {
      // Create ImportJob with status PENDING
      const importJob = await prisma.importJob.create({
        data: {
          expertProfileId: expertProfile.id,
          sourceType: "BLOG_URL",
          sourceUrl: url,
          status: "PENDING",
        },
      });

      try {
        // Set status PROCESSING
        await prisma.importJob.update({
          where: { id: importJob.id },
          data: { status: "PROCESSING" },
        });

        // Scrape blog content
        const { title, content } = await scrapeBlogContent(url);

        // Create KnowledgeItem
        const knowledgeItem = await prisma.knowledgeItem.create({
          data: {
            expertProfileId: expertProfile.id,
            title,
            content,
            sourceType: "blog",
            metadata: { sourceUrl: url },
          },
        });

        await syncKnowledgeItem(expertProfile.id, knowledgeItem.id);

        // Update ImportJob status to COMPLETED
        await prisma.importJob.update({
          where: { id: importJob.id },
          data: { status: "COMPLETED", itemsCreated: 1 },
        });

        results.push({ url, status: "success", title });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Update ImportJob status to FAILED
        await prisma.importJob.update({
          where: { id: importJob.id },
          data: { status: "FAILED", errorMessage },
        });

        results.push({ url, status: "error", error: errorMessage });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Blog import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
