import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ expertId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { expertId } = await params;

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: expertId },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert profile not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.expertProfile.update({
      where: { userId: expertId },
      data: { isVerified: false },
    });

    return NextResponse.json({
      id: expertId,
      isVerified: updated.isVerified,
    });
  } catch (error) {
    console.error("Admin unverify expert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
