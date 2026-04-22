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
  const safeFolder =
    typeof folder === "string" ? folder.replace(/[^a-zA-Z0-9-_/]/g, "") : "uploads";
  const key = `${safeFolder}/${randomUUID()}.${ext}`;

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
