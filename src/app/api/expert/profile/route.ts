import { NextRequest, NextResponse } from "next/server";
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        image: true,
        bio: true,
        headline: true,
        expertProfile: {
          select: {
            displayName: true,
            specialty: true,
            monthlyPrice: true,
            socialLinks: true,
          },
        },
      },
    });

    if (!user || !user.expertProfile) {
      return NextResponse.json(
        { error: "Expert profile not found" },
        { status: 404 }
      );
    }

    // Flatten to match the ExpertProfileData interface expected by the frontend
    const { expertProfile, ...userData } = user;
    const result = {
      ...userData,
      displayName: expertProfile.displayName,
      specialty: expertProfile.specialty,
      monthlyPrice: expertProfile.monthlyPrice,
      socialLinks: expertProfile.socialLinks as Record<string, string> | null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get expert profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "EXPERT") {
      return NextResponse.json(
        { error: "Only experts can update this resource" },
        { status: 403 }
      );
    }

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!expertProfile) {
      return NextResponse.json(
        { error: "Expert profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, displayName, headline, bio, monthlyPrice, specialty, socialLinks, image } = body;

    // Update user fields and expert profile fields in a transaction
    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(name !== undefined && { name }),
          ...(bio !== undefined && { bio }),
          ...(headline !== undefined && { headline }),
          ...(image !== undefined && { image }),
        },
        select: {
          name: true,
          email: true,
          image: true,
          bio: true,
          headline: true,
        },
      }),
      prisma.expertProfile.update({
        where: { id: expertProfile.id },
        data: {
          ...(displayName !== undefined && { displayName }),
          ...(specialty !== undefined && { specialty }),
          ...(monthlyPrice !== undefined && { monthlyPrice }),
          ...(socialLinks !== undefined && { socialLinks }),
        },
        select: {
          displayName: true,
          specialty: true,
          monthlyPrice: true,
          socialLinks: true,
        },
      }),
    ]);

    const result = {
      ...updatedUser,
      displayName: updatedProfile.displayName,
      specialty: updatedProfile.specialty,
      monthlyPrice: updatedProfile.monthlyPrice,
      socialLinks: updatedProfile.socialLinks as Record<string, string> | null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update expert profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
