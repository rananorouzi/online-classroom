"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MusicNoteLoader } from "@/components/ui/MicroInteractions";

const ResumableUpload = dynamic(
  () => import("@/components/media/ResumableUpload"),
  { ssr: false }
);
const AudioRecorder = dynamic(
  () => import("@/components/media/AudioRecorder"),
  { ssr: false }
);
const VideoRecorder = dynamic(
  () => import("@/components/media/VideoRecorder"),
  { ssr: false }
);

interface SubmitWorkPanelProps {
  isUploading: boolean;
  onUploadComplete: (fileKey: string, fileName: string, fileType: string) => void;
  onRecordingComplete: (blob: Blob, type: "audio" | "video") => void;
  onCancel: () => void;
}

export default function SubmitWorkPanel({
  isUploading,
  onUploadComplete,
  onRecordingComplete,
  onCancel,
}: SubmitWorkPanelProps) {
  const [submitMode, setSubmitMode] = useState<"file" | "voice" | "video">("file");

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Submit Work
      </h3>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        {isUploading ? (
          <MusicNoteLoader />
        ) : (
          <>
            <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
              {([
                { key: "file" as const, label: "📁 Upload File" },
                { key: "voice" as const, label: "🎤 Record Voice" },
                { key: "video" as const, label: "🎥 Record Video" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSubmitMode(key)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    submitMode === key
                      ? "bg-gold text-zinc-900"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {submitMode === "file" && (
              <ResumableUpload onUploadComplete={onUploadComplete} />
            )}
            {submitMode === "voice" && (
              <AudioRecorder
                onRecordingComplete={(blob) => onRecordingComplete(blob, "audio")}
              />
            )}
            {submitMode === "video" && (
              <VideoRecorder
                onRecordingComplete={(blob) => onRecordingComplete(blob, "video")}
              />
            )}
          </>
        )}
        <button
          onClick={onCancel}
          className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
