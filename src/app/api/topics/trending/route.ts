import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const topics = await prisma.tag.findMany({
      orderBy: { postCount: "desc" },
      take: 20,
      select: {
        name: true,
        postCount: true,
      },
    });

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Trending topics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
