import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expertId: string }> }
) {
  try {
    const { expertId } = await params;

    const expert = await prisma.user.findUnique({
      where: { id: expertId, role: "EXPERT", isActive: true, isBanned: false },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        headline: true,
        expertProfile: {
          select: {
            displayName: true,
            specialty: true,
            socialLinks: true,
            monthlyPrice: true,
            isVerified: true,
            totalSubscribers: true,
            twinGreeting: true,
          },
        },
        _count: {
          select: {
            posts: { where: { status: "PUBLISHED", isHidden: false } },
          },
        },
      },
    });

    if (!expert || !expert.expertProfile) {
      return NextResponse.json({ error: "Expert not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: expert.id,
      name: expert.name,
      image: expert.image,
      bio: expert.bio,
      headline: expert.headline,
      displayName: expert.expertProfile.displayName,
      specialty: expert.expertProfile.specialty,
      socialLinks: expert.expertProfile.socialLinks,
      monthlyPrice: expert.expertProfile.monthlyPrice,
      isVerified: expert.expertProfile.isVerified,
      subscriberCount: expert.expertProfile.totalSubscribers,
      postCount: expert._count.posts,
      twinGreeting: expert.expertProfile.twinGreeting,
    });
  } catch (error) {
    console.error("Public expert profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
