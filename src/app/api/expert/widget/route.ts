import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "EXPERT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Fetch or create widget config
    let widgetConfig = await prisma.widgetConfig.findUnique({
      where: { expertProfileId: expertProfile.id },
    });

    if (!widgetConfig) {
      widgetConfig = await prisma.widgetConfig.create({
        data: {
          expertProfileId: expertProfile.id,
          greeting: expertProfile.twinGreeting || "Hello! Ask me anything about my expertise.",
        },
      });
    }

    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const embedCode = `<script src="${appUrl}/embed/widget.js" data-api-key="${widgetConfig.apiKey}"></script>`;

    return NextResponse.json({
      ...widgetConfig,
      embedCode,
    });
  } catch (error) {
    console.error("Get widget config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "EXPERT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const { primaryColor, position, greeting, freeQuestions, allowedDomains, isEnabled } = body;

    const updateData: Record<string, unknown> = {};
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (position !== undefined) updateData.position = position;
    if (greeting !== undefined) updateData.greeting = greeting;
    if (freeQuestions !== undefined) updateData.freeQuestions = freeQuestions;
    if (allowedDomains !== undefined) updateData.allowedDomains = allowedDomains;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

    const widgetConfig = await prisma.widgetConfig.upsert({
      where: { expertProfileId: expertProfile.id },
      update: updateData,
      create: {
        expertProfileId: expertProfile.id,
        ...updateData,
      },
    });

    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const embedCode = `<script src="${appUrl}/embed/widget.js" data-api-key="${widgetConfig.apiKey}"></script>`;

    return NextResponse.json({
      ...widgetConfig,
      embedCode,
    });
  } catch (error) {
    console.error("Update widget config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
