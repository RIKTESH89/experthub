import { isPreviewIsolated } from "@/lib/preview-isolation";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import { digestEmail } from "@/lib/email/templates";

export async function POST(request: NextRequest) {
  if (isPreviewIsolated()) return NextResponse.json({ error: "External services are disabled in Preview" }, { status: 503 });
  try {
    // Existing production dispatch configuration; Preview is rejected above.
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret?.trim()) {
      return NextResponse.json({ error: "Digest dispatch is not configured" }, { status: 503 });
    }
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const period: "daily" | "weekly" = body?.period === "daily" ? "daily" : "weekly";

    // Calculate period start
    const periodStart = new Date();
    if (period === "daily") {
      periodStart.setHours(periodStart.getHours() - 24);
    } else {
      periodStart.setDate(periodStart.getDate() - 7);
    }

    // Find all expert users whose emailDigest setting matches the period
    const experts = await prisma.user.findMany({
      where: {
        expertProfile: { isNot: null },
        settings: { emailDigest: period },
      },
      include: {
        expertProfile: true,
        settings: true,
      },
    });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const expert of experts) {
      if (!expert.email || !expert.expertProfile) {
        skipped++;
        continue;
      }

      const expertProfileId = expert.expertProfile.id;

      // Count new subscribers in the period
      const newSubscribers = await prisma.expertSubscription.count({
        where: {
          expertProfileId,
          createdAt: { gte: periodStart },
        },
      });

      // Count new comments on their posts
      const newComments = await prisma.comment.count({
        where: {
          createdAt: { gte: periodStart },
          post: { authorId: expert.id },
        },
      });

      // Count twin chats in the period
      const twinChats = await prisma.chatSession.count({
        where: {
          expertProfileId,
          createdAt: { gte: periodStart },
        },
      });

      // Skip if all stats are 0
      if (newSubscribers === 0 && newComments === 0 && twinChats === 0) {
        skipped++;
        continue;
      }

      const html = digestEmail(expert.name || "Expert", {
        newSubscribers,
        newComments,
        twinChats,
        period: period === "daily" ? "Daily" : "Weekly",
      });

      const subject = `Your ${period === "daily" ? "Daily" : "Weekly"} ExpertHub Digest`;

      if (await sendEmail({ to: expert.email, subject, html })) sent++;
      else failed++;
    }

    return NextResponse.json({ sent, skipped, failed });
  } catch {
    console.error("Digest email dispatch failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
