import { withKnowledgeOwnerWrite } from "@/lib/knowledge/lifecycle";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["archive", "remove", "restore"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { postId } = await params;

    const body = await request.json();
    const validation = actionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = validation.data;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "archive":
        updateData = { status: "ARCHIVED", isHidden: false };
        break;
      case "remove":
        updateData = { isHidden: true };
        break;
      case "restore":
        updateData = { status: "PUBLISHED", isHidden: false };
        break;
    }

    const updatedPost = await withKnowledgeOwnerWrite(post.authorId, tx => tx.post.update({
      where: { id: postId },
      data: updateData,
      select: {
        id: true,
        title: true,
        status: true,
        isHidden: true,
      },
    }));

    return NextResponse.json({
      ...updatedPost,
      status: updatedPost.isHidden ? "REMOVED" : updatedPost.status,
    });
  } catch (error) {
    console.error("Admin content action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
