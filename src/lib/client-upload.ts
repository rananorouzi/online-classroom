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
  url?: string;
}

interface BlobUploadResponse {
  pathname?: string;
  url?: string;
  downloadUrl?: string;
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

export async function uploadMediaFile({
  file,
  fileName,
  contentType,
  folder,
  onProgress,
}: UploadOptions): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const endpoint = `/api/media/upload-url?filename=${encodeURIComponent(fileName)}&folder=${encodeURIComponent(folder)}`;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Content-Type", contentType);

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
        try {
          const data = JSON.parse(xhr.responseText) as BlobUploadResponse;
          const key = data.pathname ?? data.url ?? "";
          const resultUrl = data.url ?? data.downloadUrl ?? data.pathname;
          resolve({ key, fileName, fileType: contentType, url: resultUrl });
        } catch {
          resolve({ key: "", fileName, fileType: contentType });
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}
