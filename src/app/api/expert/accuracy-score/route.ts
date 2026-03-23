import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateTwinScore } from "@/lib/ai/accuracy-scorer";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "EXPERT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expertProfile = await prisma.expertProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!expertProfile) {
    return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });
  }

  let score = await prisma.twinAccuracyScore.findUnique({
    where: { expertProfileId: expertProfile.id },
  });

  if (!score) {
    const result = await calculateTwinScore(expertProfile.id);
    score = await prisma.twinAccuracyScore.findUnique({
      where: { expertProfileId: expertProfile.id },
    });
    if (!score) {
      return NextResponse.json({
        overallScore: result.overallScore,
        components: result.components,
        calculatedAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({
    overallScore: score.overallScore,
    components: score.components,
    calculatedAt: score.calculatedAt,
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "EXPERT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expertProfile = await prisma.expertProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!expertProfile) {
    return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });
  }

  const result = await calculateTwinScore(expertProfile.id);

  return NextResponse.json({
    overallScore: result.overallScore,
    components: result.components,
    calculatedAt: new Date().toISOString(),
  });
}
