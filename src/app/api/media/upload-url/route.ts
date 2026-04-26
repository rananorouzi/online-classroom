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
  const isAllowedContentType = allowedPrefixes.some((allowed) =>
    allowed.endsWith("/")
      ? contentType.startsWith(allowed)
      : contentType === allowed
  );
  if (!isAllowedContentType) {
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

    const expectedBase = `submissions/${session.user.id}`;
    if (requestedFolder !== expectedBase && !requestedFolder.startsWith(`${expectedBase}/`)) {
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
  } catch (error) {
    const errorWithCode = error as Error & { code?: string };
    return NextResponse.json(
      {
        error: "Failed to generate upload URL",
        code: errorWithCode.code,
      },
      { status: 500 }
    );
  }
}
