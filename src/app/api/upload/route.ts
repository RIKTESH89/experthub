import { boundedMultipart, verifiedMedia } from "@/lib/upload/validation";
import { isPreviewIsolated } from "@/lib/preview-isolation";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  video: ["video/mp4", "video/webm", "video/ogg"],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"],
};

// Per-type file size limits (keep low for free tier S3)
const MAX_FILE_SIZES: Record<string, number> = {
  image: 2 * 1024 * 1024,   // 2MB
  video: 10 * 1024 * 1024,  // 10MB
  audio: 3 * 1024 * 1024,   // 3MB
};

const MAX_FILE_SIZE_LABELS: Record<string, string> = {
  image: "2MB",
  video: "10MB",
  audio: "3MB",
};

// Lazy-initialize S3 client (avoid crash if env vars missing)
let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return null;
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export async function POST(request: NextRequest) {
  if (isPreviewIsolated()) return NextResponse.json({ error: "External services are disabled in Preview" }, { status: 503 });
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (process.env.NODE_ENV !== "development" && (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET)) {
      return NextResponse.json({ error: "Upload storage is not configured" }, { status: 503 });
    }
    let formData: FormData;
    try { formData = await boundedMultipart(request); }
    catch { return NextResponse.json({ error: "Invalid or oversized upload request" }, { status: 413 }); }
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mimeType = file.type;
    const fileCategory = Object.entries(ALLOWED_TYPES).find(([, types]) =>
      types.includes(mimeType)
    );

    if (!fileCategory) {
      return NextResponse.json(
        { error: "File type not allowed. Supported: images (2MB), videos (10MB), audio (3MB)" },
        { status: 400 }
      );
    }

    const [category] = fileCategory;
    const maxSize = MAX_FILE_SIZES[category] || 2 * 1024 * 1024;
    const maxLabel = MAX_FILE_SIZE_LABELS[category] || "2MB";

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${maxLabel} limit for ${category} files` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const verified = verifiedMedia(buffer, mimeType);
    if (!verified || verified.category !== category || buffer.length !== file.size) {
      return NextResponse.json({ error: "File content does not match a supported media type" }, { status: 400 });
    }
    const ext = verified.ext;
    const uniqueName = `${randomUUID()}.${ext}`;
    const s3Key = `${category}/${uniqueName}`;

    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET || "experthub-uploads";

    if (!client) {
      // Fallback to local storage if S3 not configured (dev mode)
      const { writeFile, mkdir } = await import("fs/promises");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads", category);
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, uniqueName), buffer);

      return NextResponse.json(
        {
          url: `/uploads/${category}/${uniqueName}`,
          filename: uniqueName,
          originalName: file.name,
          size: file.size,
          type: mimeType,
          category,
        },
        { status: 201 }
      );
    }

    // Upload to S3
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: verified.mime,
        ContentDisposition: "attachment",
      })
    );

    const region = process.env.AWS_REGION || "ap-south-1";
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    return NextResponse.json(
      {
        url,
        filename: uniqueName,
        originalName: file.name,
        size: file.size,
        type: mimeType,
        category,
      },
      { status: 201 }
    );
  } catch {
    console.error("Upload failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
