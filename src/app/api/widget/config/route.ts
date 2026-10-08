import { resolveReleasedPresentation } from "@/lib/persona/serving";
import { ACTIVE_MANIFEST_VERSION } from "@/lib/persona/manifest";
import { previewCanonicalOrigin } from "@/lib/preview-isolation";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get("apiKey");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const widgetConfig = await prisma.widgetConfig.findUnique({
      where: { apiKey },
      include: {
        expertProfile: {
          select: {
            displayName: true,
            twinGreeting: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!widgetConfig) {
      return NextResponse.json(
        { error: "Widget not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!widgetConfig.isEnabled) {
      return NextResponse.json(
        { error: "Widget is disabled" },
        { status: 404, headers: corsHeaders }
      );
    }

    const released=await resolveReleasedPresentation(widgetConfig.expertProfileId);
    const greeting=released?.format===ACTIVE_MANIFEST_VERSION ? released.widgetGreeting : (widgetConfig.greeting || released?.greeting || widgetConfig.expertProfile.twinGreeting);
    const platformUrl = previewCanonicalOrigin() || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";

    return NextResponse.json(
      {
        expertName: released?.displayName ?? (widgetConfig.expertProfile.displayName || widgetConfig.expertProfile.user.name),
        expertImage: widgetConfig.expertProfile.user.image,
        greeting: greeting || "Hello! Ask me anything.",
        primaryColor: widgetConfig.primaryColor,
        position: widgetConfig.position,
        freeQuestions: widgetConfig.freeQuestions,
        platformUrl,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Widget config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
