import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSignedUploadUrl } from "@/lib/s3";
import { randomUUID } from "crypto";

/**
 * Generate a signed upload URL for teacher audio feedback.
 * POST /api/media/upload-url
 * Body: { contentType: string, folder: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { contentType, folder } = await req.json();

  if (!contentType || typeof contentType !== "string") {
    return NextResponse.json(
      { error: "contentType is required" },
      { status: 400 }
    );
  }

  const allowedTypes = [
    "audio/webm",
    "audio/opus",
    "audio/ogg",
    "video/mp4",
    "video/webm",
  ];
  if (!allowedTypes.includes(contentType)) {
    return NextResponse.json(
      { error: "Unsupported content type" },
      { status: 400 }
    );
  }

  const ext = contentType.split("/")[1];
  const requestedFolder = typeof folder === "string" ? folder.trim() : "feedback";
  const folderPattern = /^feedback(?:\/[a-zA-Z0-9_-]+)*$/;

  if (!folderPattern.test(requestedFolder)) {
    return NextResponse.json(
      { error: "Invalid folder. Only feedback/* paths are allowed." },
      { status: 400 }
    );
  }

  const key = `${requestedFolder}/${randomUUID()}.${ext}`;

  try {
    const url = await getSignedUploadUrl(key, contentType);
    return NextResponse.json({ url, key });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
