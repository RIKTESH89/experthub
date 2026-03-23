import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateReportSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"]),
  adminNotes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [rawReports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: { id: true, name: true, email: true, image: true },
          },
          reported: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    // Fetch associated posts for reports that reference post content
    const postIds = rawReports
      .filter((r) => r.contentType === "post" && r.contentId)
      .map((r) => r.contentId);

    const posts = postIds.length > 0
      ? await prisma.post.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            title: true,
            content: true,
            author: { select: { name: true } },
          },
        })
      : [];

    const postMap = new Map(posts.map((p) => [p.id, p]));

    const reports = rawReports.map((report) => ({
      ...report,
      description: report.adminNotes,
      post: postMap.get(report.contentId) || {
        id: report.contentId,
        title: null,
        content: "Content unavailable",
        author: { name: report.reported?.name || "Unknown" },
      },
    }));

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List reports error:", error);
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
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateReportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { reportId, status, adminNotes } = validation.data;

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        ...(adminNotes !== undefined && { adminNotes }),
      },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        reported: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error("Update report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
