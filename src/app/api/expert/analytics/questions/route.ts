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

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "30d";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [questions, total] = await Promise.all([
      prisma.twinInteraction.findMany({
        where: {
          expertProfileId: expertProfile.id,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          question: true,
          answerQuality: true,
          topicCategory: true,
          sourcesUsed: true,
          isFromWidget: true,
          createdAt: true,
        },
      }),
      prisma.twinInteraction.count({
        where: {
          expertProfileId: expertProfile.id,
          createdAt: { gte: startDate },
        },
      }),
    ]);

    return NextResponse.json({
      questions: questions.map((q) => ({
        ...q,
        createdAt: q.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Analytics questions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
