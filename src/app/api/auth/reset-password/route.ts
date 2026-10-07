import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import { passwordChangedEmail } from "@/lib/email/templates";
import { isFullSiteStaging } from "@/lib/staging-testing";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  if (isFullSiteStaging()) return NextResponse.json({ message: "Sign in with Google. Password recovery is not available.", code: "PASSWORD_RECOVERY_RETIRED" }, { status: 410 });
  try {
    const body = await request.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues?.[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { message: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { hashedPassword },
    });

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    await sendEmail({
      to: resetToken.user.email,
      subject: "Your password has been changed - ExpertHub",
      html: passwordChangedEmail(resetToken.user.name || "there"),
    });

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
