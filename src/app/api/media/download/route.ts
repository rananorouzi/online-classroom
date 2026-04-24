import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessMediaKey, isValidMediaKey } from "@/lib/media-access";
import { getSignedReadUrl } from "@/lib/s3";

async function buildDownloadResponse(sessionUserId: string, role: string | undefined, key: string) {
  if (!isValidMediaKey(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const hasAccess = await canAccessMediaKey(sessionUserId, role, key);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = await getSignedReadUrl(key);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate download link" },
      { status: 500 }
    );
  }
}

/**
 * Generate a temporary signed download link for offline practice.
 * GET /api/media/download?key=...
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const role = (session.user as { role?: string }).role;
  return buildDownloadResponse(session.user.id, role, key);
}

/**
 * Generate a temporary signed download link for offline practice.
 * POST /api/media/download
 * Body: { key: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { key?: unknown };
  const key = typeof body.key === "string" ? body.key : null;
  if (!key) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const role = (session.user as { role?: string }).role;
  return buildDownloadResponse(session.user.id, role, key);
}
