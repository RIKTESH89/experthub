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
        { error: "Only experts can access memories" },
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
    const subscriberId = searchParams.get("subscriberId");

    const where: { expertProfileId: string; subscriberId?: string } = {
      expertProfileId: expertProfile.id,
    };

    if (subscriberId) {
      where.subscriberId = subscriberId;
    }

    const memories = await prisma.subscriberMemory.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(memories);
  } catch (error) {
    console.error("Get memories error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can delete memories" },
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

    const body = await request.json();
    const { memoryId } = body;

    if (!memoryId) {
      return NextResponse.json(
        { error: "memoryId is required" },
        { status: 400 }
      );
    }

    const memory = await prisma.subscriberMemory.findUnique({
      where: { id: memoryId },
    });

    if (!memory) {
      return NextResponse.json(
        { error: "Memory not found" },
        { status: 404 }
      );
    }

    if (memory.expertProfileId !== expertProfile.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await prisma.subscriberMemory.delete({
      where: { id: memoryId },
    });

    return NextResponse.json({ message: "Memory deleted successfully" });
  } catch (error) {
    console.error("Delete memory error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
