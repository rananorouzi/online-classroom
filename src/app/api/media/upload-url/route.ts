import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSignedUploadUrl } from "@/lib/s3";
import { randomUUID } from "crypto";

/**
 * Generate a signed upload URL for media files.
 * POST /api/media/upload-url
 * Body: { contentType: string, folder: string, fileName?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "TEACHER" && role !== "ADMIN" && role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { contentType, folder, fileName } = await req.json();

  if (!contentType || typeof contentType !== "string") {
    return NextResponse.json(
      { error: "contentType is required" },
      { status: 400 }
    );
  }

  const allowedPrefixes = [
    "audio/",
    "video/",
    "image/",
    "application/pdf",
  ];
  if (!allowedPrefixes.some((prefix) => contentType.startsWith(prefix))) {
    return NextResponse.json(
      { error: "Unsupported content type" },
      { status: 400 }
    );
  }

  let requestedFolder =
    typeof folder === "string" && folder.trim() ? folder.trim() : "feedback";
  const folderPattern = /^(feedback|lessons|submissions)(?:\/[a-zA-Z0-9_-]+)*$/;

  if (!folderPattern.test(requestedFolder)) {
    return NextResponse.json(
      {
        error:
          "Invalid folder. Only feedback/*, lessons/*, or submissions/* paths are allowed.",
      },
      { status: 400 }
    );
  }

  if (role === "STUDENT") {
    if (requestedFolder === "submissions") {
      requestedFolder = `submissions/${session.user.id}`;
    }

    const expectedPrefix = `submissions/${session.user.id}`;
    if (!requestedFolder.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "Students can only upload to their own submissions folder." },
        { status: 403 }
      );
    }
  }

  if (
    (role === "TEACHER" || role === "ADMIN") &&
    requestedFolder.startsWith("submissions")
  ) {
    return NextResponse.json(
      { error: "Teachers and admins cannot upload to student submissions folders." },
      { status: 403 }
    );
  }

  const normalizedFileName =
    typeof fileName === "string" ? fileName.trim().toLowerCase() : "";
  const rawExt = normalizedFileName.includes(".")
    ? normalizedFileName.split(".").pop() || ""
    : "";
  const safeNameExt = rawExt.replace(/[^a-z0-9]/g, "").slice(0, 10);
  const contentTypeExt = contentType.split("/")[1]?.split(";")[0] || "bin";
  const safeTypeExt = contentTypeExt.replace(/[^a-z0-9]/gi, "").slice(0, 10);
  const ext = safeNameExt || safeTypeExt || "bin";

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
