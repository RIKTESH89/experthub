import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { isFullSiteStaging } from "@/lib/staging-testing";

const applicationSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  specialty: z.string().min(2, "Area of expertise is required"),
  reason: z.string().min(10, "Please tell us why you want to be an expert"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = applicationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { name, email, specialty, reason } = validation.data;
    const staging = isFullSiteStaging();
    const accepted = () => NextResponse.json({ message: "Application submitted successfully" }, { status: 201 });

    // Check if they already have a pending or approved application
    const existing = await prisma.expertApplication.findFirst({
      where: {
        email,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (existing) {
      if (staging) return accepted();
      if (existing.status === "APPROVED") {
        return NextResponse.json(
          { error: "This email has already been approved. Please sign in with Google." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "You already have a pending application. We'll get back to you soon." },
        { status: 409 }
      );
    }

    // Check if already an expert user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser?.role === "EXPERT") {
      if (staging) return accepted();
      return NextResponse.json(
        { error: "This email is already registered as an expert. Please sign in with Google." },
        { status: 409 }
      );
    }

    await prisma.expertApplication.create({
      data: { name, email, specialty, reason },
    });

    return accepted();
  } catch (error) {
    console.error("Expert application error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
