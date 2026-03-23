import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUBSCRIBER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [activeSubscriptions, bookmarkedPosts, chatSessions] =
      await Promise.all([
        prisma.expertSubscription.count({
          where: { subscriberId: userId, status: "ACTIVE" },
        }),
        prisma.bookmark.count({
          where: { userId },
        }),
        prisma.chatSession.count({
          where: { subscriberId: userId },
        }),
      ]);

    return NextResponse.json({
      activeSubscriptions,
      bookmarkedPosts,
      twinChats: chatSessions,
    });
  } catch (error) {
    console.error("Subscriber stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
