import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { analyzePersonality } from "@/lib/ai/personality-analyzer";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can access personality profile" },
        { status: 403 }
      );
    }

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        personalityProfile: true,
      },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      personalityProfile: expertProfile.personalityProfile,
    });
  } catch (error) {
    console.error("Get personality profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can analyze personality" },
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

    const profile = await analyzePersonality(expertProfile.id);

    await prisma.expertProfile.update({
      where: { id: expertProfile.id },
      data: {
        personalityProfile: JSON.parse(JSON.stringify(profile)),
      },
    });

    return NextResponse.json({ personalityProfile: profile });
  } catch (error) {
    if (error instanceof Error && error.name === "NoContentError") {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    console.error("Analyze personality error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
