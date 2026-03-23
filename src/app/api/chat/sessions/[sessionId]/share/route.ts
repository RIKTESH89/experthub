import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { sharedConversation: true },
    });

    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    if (chatSession.subscriberId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (chatSession.sharedConversation && chatSession.sharedConversation.isActive) {
      return NextResponse.json({
        isShared: true,
        shareId: chatSession.sharedConversation.shareId,
        shareUrl: `/shared/${chatSession.sharedConversation.shareId}`,
      });
    }

    return NextResponse.json({ isShared: false });
  } catch (error) {
    console.error("Get share status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { sharedConversation: true },
    });

    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    if (chatSession.subscriberId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let sharedConversation;

    if (chatSession.sharedConversation) {
      // Re-activate if it exists but was deactivated
      sharedConversation = await prisma.sharedConversation.update({
        where: { id: chatSession.sharedConversation.id },
        data: { isActive: true },
      });
    } else {
      // Create new shared conversation
      sharedConversation = await prisma.sharedConversation.create({
        data: {
          chatSessionId: sessionId,
          sharedById: session.user.id,
        },
      });
    }

    return NextResponse.json({
      isShared: true,
      shareId: sharedConversation.shareId,
      shareUrl: `/shared/${sharedConversation.shareId}`,
    });
  } catch (error) {
    console.error("Share conversation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { sharedConversation: true },
    });

    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    if (chatSession.subscriberId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (chatSession.sharedConversation) {
      await prisma.sharedConversation.update({
        where: { id: chatSession.sharedConversation.id },
        data: { isActive: false },
      });
    }

    return NextResponse.json({ isShared: false });
  } catch (error) {
    console.error("Unshare conversation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
