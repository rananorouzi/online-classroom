"use client";

import { useState, useRef, useCallback } from "react";

interface ResumableUploadProps {
  onUploadComplete: (fileKey: string, fileName: string, fileType: string) => void;
  maxFileSize?: number;
  allowedTypes?: string[];
}

export default function ResumableUpload({
  onUploadComplete,
  maxFileSize = 500 * 1024 * 1024, // 500MB
  allowedTypes = ["video/*", "audio/*", "image/*", "application/pdf"],
}: ResumableUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > maxFileSize) {
        setError("File is too large (max 500MB)");
        return;
      }

      setFileName(file.name);
      setUploading(true);
      setError(null);
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload/local");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            onUploadComplete(data.key, data.fileName, data.fileType);
            setUploading(false);
            setProgress(0);
            setFileName(null);
          } else {
            setError("Upload failed");
            setUploading(false);
          }
        };

        xhr.onerror = () => {
          setError("Upload failed — network error");
          setUploading(false);
        };

        xhr.send(formData);
      } catch {
        setError("Upload failed");
        setUploading(false);
      }
    },
    [maxFileSize, onUploadComplete]
  );

  return (
    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center">
      {error && (
        <p className="mb-3 text-xs text-red-400">{error}</p>
      )}
      {uploading ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">{fileName}</p>
          <div className="mx-auto h-2 max-w-xs overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gold transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">{progress}% uploaded</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-400">
            Drop video, audio, image, or PDF files, or click to browse
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Up to 500MB
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 rounded-lg bg-gold/20 px-5 py-2 text-sm font-medium text-gold transition hover:bg-gold/30"
          >
            Choose File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedTypes.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
