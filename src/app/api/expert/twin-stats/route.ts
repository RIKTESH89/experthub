import { NextResponse } from "next/server";
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
        { error: "Only experts can access twin stats" },
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

    const [totalKnowledgeItems, indexedDocuments, totalChats] =
      await Promise.all([
        prisma.knowledgeItem.count({
          where: { expertProfileId: expertProfile.id },
        }),
        prisma.knowledgeItem.count({
          where: { expertProfileId: expertProfile.id, isIndexed: true },
        }),
        prisma.chatSession.count({
          where: { expertProfileId: expertProfile.id },
        }),
      ]);

    return NextResponse.json({
      totalKnowledgeItems,
      indexedDocuments,
      totalChats,
    });
  } catch (error) {
    console.error("Twin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
