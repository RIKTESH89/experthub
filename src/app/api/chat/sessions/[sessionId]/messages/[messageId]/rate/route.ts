import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ratingSchema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, messageId } = await params;

  const body = await request.json();
  const parsed = ratingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid rating. Must be 1 or -1." },
      { status: 400 }
    );
  }

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { id: true, subscriberId: true },
  });

  if (!chatSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (chatSession.subscriberId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { id: true, chatSessionId: true, role: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.chatSessionId !== sessionId) {
    return NextResponse.json(
      { error: "Message does not belong to this session" },
      { status: 400 }
    );
  }

  if (message.role !== "assistant") {
    return NextResponse.json(
      { error: "Only assistant messages can be rated" },
      { status: 400 }
    );
  }

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { rating: parsed.data.rating },
  });

  return NextResponse.json({ success: true, rating: parsed.data.rating });
}
