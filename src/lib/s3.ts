import { del, head } from "@vercel/blob";

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
 * Direct signed upload URLs are not used in Blob mode.
 * Client upload falls back to /api/upload/local, which proxies to Blob in production.
 */
export async function getSignedUploadUrl(
  _key: string,
  _contentType: string
): Promise<string> {
  void _key;
  void _contentType;

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
