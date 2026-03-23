import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkTrialAccess } from "@/lib/trial";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expertId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { expertId } = await params;

    // Look up expertProfile by userId = expertId
    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: expertId },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert not found" },
        { status: 404 }
      );
    }

    // Check if user has an active subscription
    const subscription = await prisma.expertSubscription.findUnique({
      where: {
        subscriberId_expertProfileId: {
          subscriberId: session.user.id,
          expertProfileId: expertProfile.id,
        },
      },
    });

    const hasSubscription =
      !!subscription && subscription.status === "ACTIVE";

    if (hasSubscription) {
      return NextResponse.json({
        questionsUsed: 0,
        questionsAllowed: 0,
        hasSubscription: true,
        hasTrialAccess: true,
      });
    }

    // Check trial access
    const trial = await checkTrialAccess(session.user.id, expertProfile.id);

    return NextResponse.json({
      questionsUsed: trial.used,
      questionsAllowed: trial.limit,
      hasSubscription: false,
      hasTrialAccess: trial.allowed,
    });
  } catch (error) {
    console.error("Trial status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
