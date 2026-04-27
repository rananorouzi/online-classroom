import { del, head, put } from "@vercel/blob";

/**
 * Resolve a media key to a downloadable Blob URL.
 */
export async function getSignedReadUrl(key: string): Promise<string> {
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }
  const meta = await head(key);
  return meta.url;
}

/**
 * Generate a signed upload URL for Vercel Blob in production, fallback to proxy in local/dev.
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  if (process.env.VERCEL_ENV === "production" && process.env.BLOB_READ_WRITE_TOKEN) {
    const { url } = await put(
      key,
      "",
      {
        access: "public",
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }
    );
    return url;
  }
  // Fallback for local/dev: force client to use proxy upload
  const error = new Error(
    "Direct signed uploads are disabled in Blob mode. Use /api/upload/local proxy upload."
  ) as Error & { code?: string };
  error.code = "BLOB_DIRECT_UPLOAD_DISABLED";
  throw error;
}

/**
 * Delete an object by key.
 */
export async function deleteObjectByKey(key: string): Promise<void> {
  if (!key) return;
  await del(key);
}
