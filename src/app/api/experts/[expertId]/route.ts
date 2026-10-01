import { hasSubscriptionAccess } from "@/lib/payments/access";
import { readablePostsWhere } from "@/lib/knowledge/post-access";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expertId: string }> }
) {
  try {
    const { expertId } = await params;
    const session = await auth();

    const expert = await prisma.user.findUnique({
      where: { id: expertId, role: "EXPERT" },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        headline: true,
        createdAt: true,
        expertProfile: {
          select: {
            id: true,
            displayName: true,
            specialty: true,
            socialLinks: true,
            monthlyPrice: true,
            isVerified: true,
            totalSubscribers: true,
            ragEnabled: true,
            twinPersonality: true,
            twinGreeting: true,
          },
        },
        posts: {
          where: { AND: [readablePostsWhere(session?.user?.id)], status: "PUBLISHED", isHidden: false },
          include: {
            media: true,
            tags: { include: { tag: true } },
            _count: {
              select: { likes: true, comments: true, bookmarks: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: {
          select: {
            posts: { where: { status: "PUBLISHED" } },
          },
        },
      },
    });

    if (!expert) {
      return NextResponse.json(
        { error: "Expert not found" },
        { status: 404 }
      );
    }

    // Check subscription status for current user
    let isSubscribed = false;
    let subscription = null;

    if (session?.user?.id && expert.expertProfile) {
      const sub = await prisma.expertSubscription.findUnique({
        where: {
          subscriberId_expertProfileId: {
            subscriberId: session.user.id,
            expertProfileId: expert.expertProfile.id,
          },
        },
      });

      if (sub) {
        subscription = sub;
        if (hasSubscriptionAccess(sub)) {
          isSubscribed = true;
        }
      }
    }

    // Flatten for frontend consumption
    const response = {
      id: expert.id,
      name: expert.name,
      image: expert.image,
      bio: expert.bio,
      headline: expert.headline,
      createdAt: expert.createdAt,
      displayName: expert.expertProfile?.displayName || expert.name,
      specialty: expert.expertProfile?.specialty || [],
      socialLinks: expert.expertProfile?.socialLinks || null,
      monthlyPrice: expert.expertProfile?.monthlyPrice || 0,
      isVerified: expert.expertProfile?.isVerified || false,
      totalSubscribers: expert.expertProfile?.totalSubscribers || 0,
      ragEnabled: expert.expertProfile?.ragEnabled || false,
      twinGreeting: expert.expertProfile?.twinGreeting || null,
      expertProfileId: expert.expertProfile?.id,
      posts: expert.posts.map((post) => ({
        ...post,
        tags: post.tags.map((pt) => pt.tag.name),
      })),
      _count: {
        posts: expert._count.posts,
        subscribers: expert.expertProfile?.totalSubscribers || 0,
      },
      isSubscribed,
      subscription,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get expert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
