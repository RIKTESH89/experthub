import { withKnowledgeOwnerWrite } from "@/lib/knowledge/lifecycle";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const session = await auth();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const userId = session?.user?.id ?? null;

    // Don't count views from the author
    if (userId === post.authorId) {
      return NextResponse.json({ tracked: false });
    }

    // Generate IP hash for anonymous dedup
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check if already viewed in last 24 hours
    const existingView = await prisma.postView.findFirst({
      where: {
        postId,
        viewedAt: { gte: twentyFourHoursAgo },
        ...(userId ? { userId } : { ipHash }),
      },
    });

    if (existingView) {
      return NextResponse.json({ tracked: false });
    }

    // Deduplication and counter mutation share the same admission transaction.
    const tracked = await withKnowledgeOwnerWrite(post.authorId, async tx => {
      const prior = await tx.postView.findFirst({ where: { postId, viewedAt: { gte: twentyFourHoursAgo }, ...(userId ? { userId } : { ipHash }) } });
      if (prior) return false;
      await tx.postView.create({ data: { postId, userId, ipHash: userId ? null : ipHash } });
      await tx.post.update({ where: { id: postId }, data: { viewCount: { increment: 1 } } });
      return true;
    });
    return NextResponse.json({ tracked });
  } catch (error) {
    console.error("Track view error:", error);
    return NextResponse.json({ tracked: false });
  }
}
