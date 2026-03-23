import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Platform settings stored in-memory for now
// In production, these would be in a PlatformConfig table
let platformSettings = {
  siteName: "ExpertHub",
  siteDescription:
    "Connect with expert minds through AI-powered digital twins",
  supportEmail: "support@experthub.com",
  defaultExpertRate: "9.99",
  platformFeePercent: "15",
  maintenanceMode: false,
  registrationEnabled: true,
  expertAutoApproval: false,
  emailNotifications: true,
  contentModeration: "moderate",
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(platformSettings);
  } catch (error) {
    console.error("Get admin settings error:", error);
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
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    platformSettings = {
      ...platformSettings,
      ...body,
    };

    return NextResponse.json({ success: true, settings: platformSettings });
  } catch (error) {
    console.error("Update admin settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
