import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "EXPERT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!expertProfile) {
      return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });
    }

    const period = request.nextUrl.searchParams.get("period") || "30d";
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Find interactions where the twin struggled (low quality or no sources)
    const lowQualityInteractions = await prisma.twinInteraction.findMany({
      where: {
        expertProfileId: expertProfile.id,
        createdAt: { gte: startDate },
        OR: [
          { answerQuality: { lt: 0.5 } },
          { sourcesUsed: 0 },
        ],
      },
      select: {
        topicCategory: true,
        question: true,
        answerQuality: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by topic category
    const topicMap = new Map<string, {
      questions: string[];
      qualities: number[];
    }>();

    for (const interaction of lowQualityInteractions) {
      const topic = interaction.topicCategory || "Uncategorized";
      if (!topicMap.has(topic)) {
        topicMap.set(topic, { questions: [], qualities: [] });
      }
      const entry = topicMap.get(topic)!;
      entry.questions.push(interaction.question);
      if (interaction.answerQuality !== null) {
        entry.qualities.push(interaction.answerQuality);
      }
    }

    const gaps = Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        questionCount: data.questions.length,
        avgQuality: data.qualities.length > 0
          ? data.qualities.reduce((a, b) => a + b, 0) / data.qualities.length
          : 0,
        sampleQuestions: data.questions.slice(0, 3),
      }))
      .sort((a, b) => b.questionCount - a.questionCount);

    return NextResponse.json({ gaps });
  } catch (error) {
    console.error("Analytics topic-gaps error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
