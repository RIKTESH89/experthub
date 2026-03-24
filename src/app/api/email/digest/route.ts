import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import { digestEmail } from "@/lib/email/templates";

export async function POST(request: NextRequest) {
  try {
    // Validate API key (skip if CRON_SECRET not set — for dev)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const apiKey = request.headers.get("x-api-key");
      if (apiKey !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
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

      await sendEmail({ to: expert.email, subject, html });
      sent++;
    }

    return NextResponse.json({ sent, skipped });
  } catch (error) {
    console.error("Digest email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
