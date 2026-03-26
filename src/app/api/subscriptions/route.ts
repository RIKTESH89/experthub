import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await prisma.expertSubscription.findMany({
      where: {
        subscriberId: session.user.id,
        status: "ACTIVE",
      },
      include: {
        expertProfile: {
          select: {
            id: true,
            displayName: true,
            monthlyPrice: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                headline: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match the Subscription interface the frontend expects
    const transformed = subscriptions.map((sub) => ({
      id: sub.id,
      status: sub.status,
      monthlyPrice: sub.price,
      tier: sub.tier,
      startDate: sub.startDate.toISOString(),
      expert: {
        id: sub.expertProfile.user.id,
        displayName: sub.expertProfile.displayName,
        image: sub.expertProfile.user.image,
        headline: sub.expertProfile.user.headline,
      },
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("List subscriptions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
