import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { slugify } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues?.[0]?.message || "Validation failed",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, email, password, role } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role,
        ...(role === "EXPERT" && {
          expertProfile: {
            create: {
              displayName: name,
              vectorNamespace: `expert_temp`,
            },
          },
        }),
      },
      include: {
        expertProfile: true,
      },
    });

    // Update vectorNamespace with actual user id and slugified name
    if (role === "EXPERT" && user.expertProfile) {
      const vectorNamespace = `expert_${slugify(name)}_${user.id.slice(0, 8)}`;
      await prisma.expertProfile.update({
        where: { id: user.expertProfile.id },
        data: { vectorNamespace },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword: _pw, ...userWithoutPassword } = user;

    return NextResponse.json(
      { user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
