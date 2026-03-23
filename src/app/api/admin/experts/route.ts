import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const verified = searchParams.get("verified"); // "true" | "false" | null

    const where: Record<string, unknown> = {
      role: "EXPERT",
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        {
          expertProfile: {
            displayName: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    if (verified === "true") {
      where.expertProfile = { isVerified: true };
    } else if (verified === "false") {
      where.expertProfile = { isVerified: false };
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        expertProfile: {
          select: {
            isVerified: true,
            displayName: true,
            specialty: true,
            totalSubscribers: true,
            _count: {
              select: {
                subscriptions: true,
              },
            },
          },
        },
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    // Flatten to the shape the frontend expects
    const experts = users.map((user) => ({
      id: user.id,
      name: user.name || "Unknown",
      email: user.email,
      image: user.image,
      displayName: user.expertProfile?.displayName || user.name || "Unknown",
      specialty: user.expertProfile?.specialty || [],
      isVerified: user.expertProfile?.isVerified || false,
      createdAt: user.createdAt,
      _count: {
        subscribers: user.expertProfile?._count?.subscriptions ?? 0,
        posts: user._count.posts,
      },
    }));

    return NextResponse.json({ experts });
  } catch (error) {
    console.error("Admin list experts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
