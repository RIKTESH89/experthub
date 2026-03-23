import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hash, compare } from "bcryptjs";
import { z } from "zod";

const settingsSchema = z.object({
  emailOnNewPost: z.boolean().optional(),
  emailOnReply: z.boolean().optional(),
  emailDigest: z.enum(["daily", "weekly", "monthly", "never"]).optional(),
  twoFactorEnabled: z.boolean().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: session.user.id },
      });
    }

    return NextResponse.json({
      emailOnNewPost: settings.emailOnNewSubscriber,
      emailOnReply: settings.emailOnComment,
      emailDigest: settings.emailDigest,
      twoFactorEnabled: settings.twoFactorEnabled,
    });
  } catch (error) {
    console.error("Get subscriber settings error:", error);
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

    const body = await request.json();
    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      emailOnNewPost,
      emailOnReply,
      emailDigest,
      twoFactorEnabled,
      currentPassword,
      newPassword,
    } = validation.data;

    // Handle password change
    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { hashedPassword: true },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const isPasswordValid = await compare(currentPassword, user.hashedPassword);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }

      const hashedPassword = await hash(newPassword, 12);
      await prisma.user.update({
        where: { id: session.user.id },
        data: { hashedPassword },
      });
    }

    // Persist preferences (map subscriber field names to DB columns)
    const settingsData: Record<string, unknown> = {};
    if (emailOnNewPost !== undefined) settingsData.emailOnNewSubscriber = emailOnNewPost;
    if (emailOnReply !== undefined) settingsData.emailOnComment = emailOnReply;
    if (emailDigest !== undefined) settingsData.emailDigest = emailDigest;
    if (twoFactorEnabled !== undefined) settingsData.twoFactorEnabled = twoFactorEnabled;

    if (Object.keys(settingsData).length > 0) {
      await prisma.userSettings.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          ...settingsData,
        },
        update: settingsData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update subscriber settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
