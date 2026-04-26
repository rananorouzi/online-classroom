import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

/**
 * Local file upload for dev environment.
 * POST /api/upload/local — multipart form data with a "file" field.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file size (500MB max)
  if (file.size > 500 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  // Validate content type
  const allowedPrefixes = ["audio/", "video/", "application/pdf", "image/"];
  if (!allowedPrefixes.some((p) => file.type.startsWith(p))) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "bin";
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  const fileName = `${randomUUID()}.${safeExt}`;
  const fileKey = `uploads/${fileName}`;

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    try {
      const blob = await put(fileKey, file, {
        access: "public",
        addRandomSuffix: false,
      });

      return NextResponse.json({
        key: fileKey,
        fileName: file.name,
        fileType: file.type,
        url: blob.url,
      });
    } catch {
      return NextResponse.json(
        { error: "Blob upload failed. Check BLOB_READ_WRITE_TOKEN." },
        { status: 500 }
      );
    }
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadsDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, fileName), buffer);

  return NextResponse.json({
    key: fileKey,
    fileName: file.name,
    fileType: file.type,
    url: `/${fileKey}`,
  });
}
