import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues?.[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // TODO: In production, look up the user and send a password reset email.
    // For now, just log the request.
    console.log("Password reset requested for:", email);

    // Always return 200 regardless of whether the email exists.
    // This prevents attackers from enumerating valid email addresses.
    return NextResponse.json(
      {
        message:
          "If an account exists with that email, we've sent password reset instructions.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
