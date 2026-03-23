import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search");
    const specialty = searchParams.get("specialty");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const sort = searchParams.get("sort") || "trending";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      role: "EXPERT",
      isActive: true,
      isBanned: false,
      expertProfile: { isNot: null },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        {
          expertProfile: {
            displayName: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    if (specialty) {
      where.expertProfile = {
        ...(typeof where.expertProfile === "object" && where.expertProfile !== null ? where.expertProfile : {}),
        specialty: { has: specialty },
      };
    }

    let orderBy: Record<string, unknown>;
    switch (sort) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "most_subscribers":
        orderBy = { expertProfile: { totalSubscribers: "desc" } };
        break;
      case "trending":
      default:
        orderBy = { expertProfile: { totalSubscribers: "desc" } };
        break;
    }

    const [experts, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          headline: true,
          expertProfile: {
            select: {
              id: true,
              displayName: true,
              specialty: true,
              monthlyPrice: true,
              isVerified: true,
              totalSubscribers: true,
              twinGreeting: true,
            },
          },
          _count: {
            select: {
              posts: true,
              subscriptionsAsSubscriber: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      experts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List experts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
