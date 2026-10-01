import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "8")));

    const experts = await prisma.user.findMany({
      where: {
        role: "EXPERT",
        isActive: true,
        isBanned: false,
        expertProfile: { isNot: null },
      },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        headline: true,
        expertProfile: {
          select: {
            id: true,
            displayName: true,
            specialty: true,
            monthlyPrice: true,
            isVerified: true,
            totalSubscribers: true,
            twinGreeting: true,
          },
        },
        _count: {
          select: { posts: true },
        },
      },
      orderBy: {
        expertProfile: {
          totalSubscribers: "desc",
        },
      },
      take: limit,
    });

    return NextResponse.json({ experts });
  } catch (error) {
    console.error("Featured experts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
