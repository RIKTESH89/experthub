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
      return NextResponse.json(
        { error: "Only experts can view import history" },
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const [importJobs, total] = await Promise.all([
      prisma.importJob.findMany({
        where: { expertProfileId: expertProfile.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.importJob.count({
        where: { expertProfileId: expertProfile.id },
      }),
    ]);

    return NextResponse.json({
      items: importJobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Import history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
