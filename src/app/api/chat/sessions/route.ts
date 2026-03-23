import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { checkTrialAccess } from "@/lib/trial";

const createSessionSchema = z.object({
  expertId: z.string().min(1, "Expert ID is required"),
  title: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get("expertId");

    const where: Record<string, unknown> = { subscriberId: session.user.id };
    if (expertId) {
      const expertProfile = await prisma.expertProfile.findUnique({
        where: { userId: expertId },
      });
      if (expertProfile) {
        where.expertProfileId = expertProfile.id;
      }
    }

    const chatSessions = await prisma.chatSession.findMany({
      where,
      include: {
        expertProfile: {
          select: {
            displayName: true,
            user: { select: { id: true, name: true, image: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(chatSessions);
  } catch (error) {
    console.error("List chat sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { expertId, title } = validation.data;

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: expertId },
      include: { user: { select: { name: true } } },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert not found" },
        { status: 404 }
      );
    }

    // Check active subscription
    const subscription = await prisma.expertSubscription.findUnique({
      where: {
        subscriberId_expertProfileId: {
          subscriberId: session.user.id,
          expertProfileId: expertProfile.id,
        },
      },
    });

    const hasActiveSubscription =
      !!subscription && subscription.status === "ACTIVE";

    let isTrial = false;

    if (!hasActiveSubscription) {
      // Check free trial access
      const trial = await checkTrialAccess(session.user.id, expertProfile.id);
      if (!trial.allowed) {
        return NextResponse.json(
          {
            error: "Free trial exhausted",
            code: "TRIAL_EXHAUSTED",
            questionsUsed: trial.used,
            questionsAllowed: trial.limit,
          },
          { status: 403 }
        );
      }
      isTrial = true;
    }

    const chatSession = await prisma.chatSession.create({
      data: {
        subscriberId: session.user.id,
        expertProfileId: expertProfile.id,
        isTrial,
        title:
          title ||
          `Chat with ${expertProfile.displayName || expertProfile.user.name}`,
      },
      include: {
        expertProfile: {
          select: {
            displayName: true,
            twinGreeting: true,
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    // Add greeting message if configured
    if (expertProfile.twinGreeting) {
      await prisma.chatMessage.create({
        data: {
          chatSessionId: chatSession.id,
          role: "assistant",
          content: expertProfile.twinGreeting,
        },
      });
    }

    return NextResponse.json(chatSession, { status: 201 });
  } catch (error) {
    console.error("Create chat session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
