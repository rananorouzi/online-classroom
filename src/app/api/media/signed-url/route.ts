import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSignedReadUrl } from "@/lib/s3";

/**
 * Media proxy: generates signed URLs for HLS playlists, chunks, and audio.
 * Prevents direct S3 link sharing.
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

  // Validate the key doesn't contain path traversal
  if (key.includes("..") || key.startsWith("/")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  // Local dev fallback: serve sample media when S3 is not configured
  const isLocalDev =
    !process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID === "stub-local-dev";

  if (isLocalDev) {
    const origin = req.nextUrl.origin;

    // Serve actual uploaded files from public/
    if (key.startsWith("uploads/")) {
      return NextResponse.json({ url: `${origin}/${key}`, local: true });
    }

    // Fallback sample media for seed data
    const isVideo = key.endsWith(".m3u8") || key.endsWith(".mp4");
    const isAudio =
      key.endsWith(".webm") || key.endsWith(".opus") || key.endsWith(".ogg");

    if (isVideo || isAudio) {
      return NextResponse.json({ url: `${origin}/sample-media/sample.mp4`, local: true });
    }
    return NextResponse.json({ error: "File not found (local dev)" }, { status: 404 });
  }

  try {
    const signedUrl = await getSignedReadUrl(key);
    return NextResponse.json(
      { url: signedUrl },
      { headers: { "Cache-Control": "private, max-age=2400" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}
