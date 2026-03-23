import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can access this resource" },
        { status: 403 }
      );
    }

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert profile not found" },
        { status: 404 }
      );
    }

    const subscriptions = await prisma.expertSubscription.findMany({
      where: { expertProfileId: expertProfile.id },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        status: true,
        startDate: true,
        price: true,
        subscriber: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Transform to match the Subscriber interface expected by the frontend
    const subscribers = subscriptions.map((sub) => ({
      id: sub.subscriber.id,
      name: sub.subscriber.name ?? "Unknown",
      email: sub.subscriber.email,
      image: sub.subscriber.image,
      subscriptionDate: sub.startDate.toISOString(),
      status: sub.status,
      monthlyAmount: sub.price,
    }));

    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error("Get expert subscribers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
