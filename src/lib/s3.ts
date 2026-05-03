

import { del, head, put } from "@vercel/blob";

/**
 * Get a signed read URL for a private blob.
 */
export async function getSignedReadUrl(key: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  const meta = await head(key);
  if (!meta || !meta.url) throw new Error("Blob not found");
  return meta.url;
}

/**
 * Generate a signed upload URL for Vercel Blob (private access only).
 */
export async function getSignedUploadUrl(key: string, contentType: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  const { url } = await put(
    key,
    "",
    {
      access: "private",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    } as any // access: 'private' is valid, but type may require 'as any' for now
  );
  return url;
}

/**
 * Delete an object by key.
 */
export async function deleteObjectByKey(key: string): Promise<void> {
  if (!key) return;
  await del(key);
}
