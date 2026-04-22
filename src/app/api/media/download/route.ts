import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSignedReadUrl } from "@/lib/s3";

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

  const { key } = await req.json();
  if (!key || typeof key !== "string" || key.includes("..") || key.startsWith("/")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
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
