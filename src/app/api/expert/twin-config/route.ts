import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can access twin config" },
        { status: 403 }
      );
    }

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        twinPersonality: true,
        twinGreeting: true,
        ragEnabled: true,
      },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(expertProfile);
  } catch (error) {
    console.error("Get twin config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can update twin config" },
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
    const { twinPersonality, twinGreeting, ragEnabled } = body;

    const updated = await prisma.expertProfile.update({
      where: { id: expertProfile.id },
      data: {
        ...(twinPersonality !== undefined && { twinPersonality }),
        ...(twinGreeting !== undefined && { twinGreeting }),
        ...(ragEnabled !== undefined && { ragEnabled }),
      },
      select: {
        twinPersonality: true,
        twinGreeting: true,
        ragEnabled: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update twin config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
