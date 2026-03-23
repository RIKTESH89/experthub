import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buildGraphFromContent } from "@/lib/graph/graph-builder";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can access this resource" },
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

    const result = await buildGraphFromContent(expertProfile.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Build graph error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can access this resource" },
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

    const nodeCount = await prisma.knowledgeNode.count({
      where: { expertProfileId: expertProfile.id },
    });

    const edgeCount = await prisma.knowledgeEdge.count({
      where: { sourceNode: { expertProfileId: expertProfile.id } },
    });

    const nodes = await prisma.knowledgeNode.findMany({
      where: { expertProfileId: expertProfile.id },
      include: {
        _count: {
          select: {
            outEdges: true,
            inEdges: true,
          },
        },
      },
    });

    const topConcepts = nodes
      .map((node) => ({
        concept: node.concept,
        edgeCount: node._count.outEdges + node._count.inEdges,
      }))
      .sort((a, b) => b.edgeCount - a.edgeCount)
      .slice(0, 10);

    return NextResponse.json({ nodeCount, edgeCount, topConcepts });
  } catch (error) {
    console.error("Get graph stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
