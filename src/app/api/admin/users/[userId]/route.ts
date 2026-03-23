import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isBanned: true,
        isActive: true,
        bio: true,
        headline: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            subscriptionsAsSubscriber: true,
          },
        },
        posts: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            content: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name || "Unknown",
      email: user.email,
      image: user.image,
      role: user.role,
      status: user.isBanned ? "banned" : "active",
      bio: user.bio,
      headline: user.headline,
      createdAt: user.createdAt,
      _count: {
        posts: user._count.posts,
        subscriptions: user._count.subscriptionsAsSubscriber,
      },
      recentPosts: user.posts.map((post) => ({
        id: post.id,
        title: post.title,
        content: post.content || "",
        status: post.status,
        createdAt: post.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "EXPERT", "SUBSCRIBER"]).optional(),
  isBanned: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { userId } = await params;

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-demotion
    if (userId === session.user.id && validation.data.role && validation.data.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Cannot change your own admin role" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...validation.data };

    // If promoting to EXPERT, create expert profile if needed
    if (updateData.role === "EXPERT" && existingUser.role !== "EXPERT") {
      const existingProfile = await prisma.expertProfile.findUnique({
        where: { userId },
      });

      if (!existingProfile) {
        await prisma.expertProfile.create({
          data: {
            userId,
            displayName: existingUser.name || "Expert",
            vectorNamespace: `expert_${userId}`,
          },
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isBanned: true,
        createdAt: true,
        expertProfile: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { userId } = await params;

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
