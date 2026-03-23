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

    const tierBreakdown = await prisma.expertSubscription.groupBy({
      by: ["tier"],
      where: {
        expertProfileId: expertProfile.id,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      _sum: { price: true },
    });

    const result = tierBreakdown.map((t) => ({
      tier: t.tier,
      subscriberCount: t._count.id,
      revenue: t._sum.price || 0,
    }));

    return NextResponse.json({ breakdown: result });
  } catch (error) {
    console.error("Analytics revenue error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
