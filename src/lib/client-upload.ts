"use client";

type UploadFolder = string;

interface UploadOptions {
  file: Blob;
  fileName: string;
  contentType: string;
  folder: UploadFolder;
  onProgress?: (percent: number) => void;
}

interface UploadResult {
  key: string;
  fileName: string;
  fileType: string;
}

function uploadToSignedUrl(
  signedUrl: string,
  file: Blob,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", contentType);

    let fallbackProgress = 1;
    onProgress?.(fallbackProgress);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
          return;
        }

        // Some browsers/storage providers do not report total bytes.
        fallbackProgress = Math.min(fallbackProgress + 5, 95);
        onProgress(fallbackProgress);
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error("Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

async function uploadToLocalRoute(
  file: Blob,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file, fileName);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/local");

    let fallbackProgress = 1;
    onProgress?.(fallbackProgress);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
          return;
        }

        fallbackProgress = Math.min(fallbackProgress + 5, 95);
        onProgress(fallbackProgress);
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        const data = JSON.parse(xhr.responseText) as {
          key: string;
          fileName: string;
          fileType: string;
        };
        resolve(data);
      } else {
        reject(new Error("Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}

export async function uploadMediaFile({
  file,
  fileName,
  contentType,
  folder,
  onProgress,
}: UploadOptions): Promise<UploadResult> {
  const response = await fetch("/api/media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType, folder, fileName }),
  });

  if (response.ok) {
    const data = (await response.json()) as { url: string; key: string };
    await uploadToSignedUrl(data.url, file, contentType, onProgress);
    return { key: data.key, fileName, fileType: contentType };
  }

  // Local development fallback when signed uploads are unavailable.
  return uploadToLocalRoute(file, fileName, onProgress);
}
