import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { sendEmail } from "@/lib/email/resend";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body; // "approve" or "reject"

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    const application = await prisma.expertApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.status !== "PENDING") {
      return NextResponse.json(
        { error: "Application has already been processed" },
        { status: 400 }
      );
    }

    if (action === "reject") {
      await prisma.expertApplication.update({
        where: { id },
        data: { status: "REJECTED" },
      });

      // Send rejection email (fire-and-forget)
      sendEmail({
        to: application.email,
        subject: "ExpertHub — Application Update",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2>Hi ${application.name},</h2>
            <p>Thank you for your interest in becoming an expert on ExpertHub.</p>
            <p>After reviewing your application, we're unable to approve it at this time. This could be due to capacity limits or alignment with our current focus areas.</p>
            <p>You're welcome to reapply in the future. In the meantime, you can still use ExpertHub as a subscriber to learn from our existing experts.</p>
            <p>Best regards,<br/>The ExpertHub Team</p>
          </div>
        `,
      }).catch(() => {});

      return NextResponse.json({ status: "REJECTED" });
    }

    // Approve: create user + expert profile
    let user = await prisma.user.findUnique({
      where: { email: application.email },
    });

    if (user) {
      // User exists (maybe signed in as subscriber before) — upgrade to expert
      if (user.role !== "EXPERT") {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "EXPERT", name: user.name || application.name },
        });

        // Create expert profile if not exists
        const existingProfile = await prisma.expertProfile.findUnique({
          where: { userId: user.id },
        });

        if (!existingProfile) {
          const vectorNamespace = `expert_${slugify(application.name)}_${user.id.slice(0, 8)}`;
          await prisma.expertProfile.create({
            data: {
              userId: user.id,
              displayName: application.name,
              specialty: [application.specialty],
              vectorNamespace,
            },
          });
        }
      }
    } else {
      // Create new user + expert profile
      user = await prisma.user.create({
        data: {
          name: application.name,
          email: application.email,
          role: "EXPERT",
        },
      });

      const vectorNamespace = `expert_${slugify(application.name)}_${user.id.slice(0, 8)}`;
      await prisma.expertProfile.create({
        data: {
          userId: user.id,
          displayName: application.name,
          specialty: [application.specialty],
          vectorNamespace,
        },
      });
    }

    // Update application status
    await prisma.expertApplication.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    // Send approval email (fire-and-forget)
    sendEmail({
      to: application.email,
      subject: "Welcome to ExpertHub — You're Approved!",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Congratulations, ${application.name}! 🎉</h2>
          <p>Your application to become an expert on ExpertHub has been approved.</p>
          <p>You can now sign in with your Google account and start setting up your expert profile:</p>
          <ul>
            <li>Configure your AI Digital Twin</li>
            <li>Upload your knowledge base</li>
            <li>Set your subscription pricing</li>
            <li>Publish posts for your subscribers</li>
          </ul>
          <p style="margin-top: 20px;">
            <a href="https://experthub.co.in/login" style="background: #4F46E5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Sign In to ExpertHub</a>
          </p>
          <p style="margin-top: 20px;">Best regards,<br/>The ExpertHub Team</p>
        </div>
      `,
    }).catch(() => {});

    return NextResponse.json({ status: "APPROVED" });
  } catch (error) {
    console.error("Process expert application error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
