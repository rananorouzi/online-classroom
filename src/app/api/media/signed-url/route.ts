import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessMediaKey, isValidMediaKey } from "@/lib/media-access";
import { getSignedReadUrl } from "@/lib/s3";
import { existsSync } from "fs";
import path from "path";

/**
 * Media proxy: resolves secure URLs for HLS playlists, chunks, and audio.
 * Prevents direct object-store link sharing.
 *
 * GET /api/media/signed-url?key=courses/week1/video.m3u8
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key || typeof key !== "string") {
    return NextResponse.json(
      { error: "Missing 'key' parameter" },
      { status: 400 }
    );
  }

  // If the stored key is already a full URL, redirect to it directly
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return NextResponse.json({ url: key });
  }

  if (!isValidMediaKey(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const role = (session.user as { role?: string }).role;
  const hasAccess = await canAccessMediaKey(session.user.id, role, key);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const signedUrl = await getSignedReadUrl(key);
    return NextResponse.json(
      { url: signedUrl },
      { headers: { "Cache-Control": "private, max-age=2400" } }
    );
  } catch {
    const isDevLocalFallback = process.env.NODE_ENV !== "production" && !process.env.VERCEL;
    if (!isDevLocalFallback) {
      return NextResponse.json(
        { error: "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    const origin = req.nextUrl.origin;

    // If the file was uploaded locally it lives under public/<key>
    const localPath = path.join(process.cwd(), "public", key);
    if (existsSync(localPath)) {
      return NextResponse.json({ url: `${origin}/${key}`, local: true });
    }

    // Legacy uploads/ prefix
    if (key.startsWith("uploads/")) {
      return NextResponse.json({ url: `${origin}/${key}`, local: true });
    }

    // Fallback to sample media so the player doesn't hard-error during dev
    const isVideo = key.endsWith(".m3u8") || key.endsWith(".mp4");
    const isAudio =
      key.endsWith(".webm") || key.endsWith(".opus") || key.endsWith(".ogg");
    if (isVideo || isAudio) {
      return NextResponse.json({ url: `${origin}/sample-media/sample.mp4`, local: true });
    }

    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}
