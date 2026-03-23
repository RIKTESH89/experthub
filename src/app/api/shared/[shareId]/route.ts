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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    const shared = await prisma.sharedConversation.findUnique({
      where: { shareId, isActive: true },
      include: {
        chatSession: {
          include: {
            messages: { orderBy: { createdAt: "asc" } },
            expertProfile: {
              include: {
                user: { select: { name: true, image: true } },
              },
            },
          },
        },
      },
    });

    if (!shared) {
      return NextResponse.json(
        { error: "Shared conversation not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(shared, { headers: corsHeaders });
  } catch (error) {
    console.error("Get shared conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
