"use client";

import { useState, useTransition, useCallback } from "react";
import dynamic from "next/dynamic";
import StyledAudioPlayer from "@/components/media/StyledAudioPlayer";

const AudioRecorder = dynamic(
  () => import("@/components/media/AudioRecorder"),
  { ssr: false }
);

interface Submission {
  id: string;
  status: string;
  createdAt: string;
  fileKey: string | null;
  fileName: string | null;
  fileType: string | null;
  student: { id: string; name: string | null; email: string };
  feedbacks: {
    comment: string | null;
    audioKey: string | null;
    approved?: boolean;
    createdAt: string;
  }[];
}

interface TeacherReviewPanelProps {
  submissions: Submission[];
  checklistItemTitle: string;
}

export default function TeacherReviewPanel({
  submissions,
  checklistItemTitle,
}: TeacherReviewPanelProps) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">
        <p className="text-sm text-zinc-500">No student submissions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Student Submissions — {checklistItemTitle}
      </h3>
      {submissions.map((sub) => (
        <SubmissionReviewCard key={sub.id} submission={sub} />
      ))}
    </div>
  );
}

function SubmissionReviewCard({ submission }: { submission: Submission }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [comment, setComment] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const latestFeedback = submission.feedbacks[0];
  const isPending_ = submission.status === "PENDING";

  const handleApprove = useCallback(() => {
    startTransition(async () => {
      try {
        const { approveSubmission } = await import(
          "@/app/actions/submissions"
        );
        await approveSubmission(submission.id);
        setResult({ type: "success", text: "Approved!" });
      } catch (e) {
        setResult({ type: "error", text: (e as Error).message });
      }
    });
  }, [submission.id]);

  const handleSubmitFeedback = useCallback(
    (approve: boolean) => {
      startTransition(async () => {
        try {
          let audioKey: string | undefined;

          // Upload audio blob if recorded
          if (audioBlob) {
            const formData = new FormData();
            formData.append("file", audioBlob, "feedback.webm");
            const res = await fetch("/api/upload/local", {
              method: "POST",
              body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              audioKey = data.key;
            }
          }

          if (approve) {
            const { approveWithFeedback } = await import(
              "@/app/actions/submissions"
            );
            await approveWithFeedback(
              submission.id,
              comment,
              audioKey
            );
            setResult({ type: "success", text: "Approved with feedback!" });
          } else {
            const { requestRevision } = await import(
              "@/app/actions/submissions"
            );
            await requestRevision(
              submission.id,
              comment,
              audioKey
            );
            setResult({ type: "success", text: "Revision requested" });
          }
          setShowFeedback(false);
          setComment("");
          setAudioBlob(null);
        } catch (e) {
          setResult({ type: "error", text: (e as Error).message });
        }
      });
    },
    [submission.id, comment, audioBlob]
  );

  const fileUrl = submission.fileKey
    ? submission.fileKey.startsWith("uploads/")
      ? `/${submission.fileKey}`
      : `/api/media/download?key=${encodeURIComponent(submission.fileKey)}`
    : null;

  const isVideo = submission.fileType?.startsWith("video/");
  const isAudio = submission.fileType?.startsWith("audio/");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      {/* Student info + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
            {(submission.student.name || "S")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              {submission.student.name || submission.student.email}
            </p>
            <p className="text-xs text-zinc-500">{submission.student.email}</p>
          </div>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      {/* Dates */}
      <div className="flex items-center gap-3 text-[10px] text-zinc-600">
        <span>Submitted {new Date(submission.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        {submission.feedbacks.length > 0 && (
          <span>· Reviewed {new Date(submission.feedbacks[0].createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        )}
      </div>

      {/* Submitted file preview */}
      {fileUrl && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <p className="mb-2 text-xs text-zinc-500">
            Submitted: {submission.fileName}
          </p>
          {isVideo && (
            <video
              src={fileUrl}
              controls
              className="w-full rounded-lg"
              style={{ maxHeight: 300 }}
            />
          )}
          {isAudio && fileUrl && <StyledAudioPlayer src={fileUrl} />}
          {!isVideo && !isAudio && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gold hover:underline"
            >
              Download {submission.fileName}
            </a>
          )}
        </div>
      )}

      {/* Latest existing feedback */}
      {latestFeedback?.comment && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
          <p className="text-xs text-zinc-500 mb-1">Previous feedback:</p>
          <p className="text-sm text-zinc-300">{latestFeedback.comment}</p>
        </div>
      )}

      {/* Result notification */}
      {result && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            result.type === "success"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {result.text}
        </div>
      )}

      {/* Action buttons - only show for PENDING submissions */}
      {isPending_ && !showFeedback && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
          >
            Give Feedback
          </button>
        </div>
      )}

      {/* Feedback form */}
      {showFeedback && (
        <div className="space-y-3 border-t border-zinc-800 pt-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write feedback for the student..."
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-gold focus:outline-none"
          />

          {/* Audio Recorder */}
          <div className="flex items-center gap-3">
            <AudioRecorder
              onRecordingComplete={(blob) => setAudioBlob(blob)}
            />
            {audioBlob && (
              <span className="text-xs text-emerald-400">
                ✓ Audio recorded ({(audioBlob.size / 1024).toFixed(0)}KB)
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleSubmitFeedback(true)}
              disabled={isPending || !comment.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Approve with Feedback"}
            </button>
            <button
              onClick={() => handleSubmitFeedback(false)}
              disabled={isPending || !comment.trim()}
              className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-orange-500 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Request Revision"}
            </button>
            <button
              onClick={() => {
                setShowFeedback(false);
                setComment("");
                setAudioBlob(null);
              }}
              className="rounded-lg px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    IDLE: { label: "Not Started", cls: "bg-zinc-800 text-zinc-400" },
    PENDING: { label: "Pending Review", cls: "bg-amber-400/10 text-amber-400" },
    REVISION: {
      label: "Needs Revision",
      cls: "bg-orange-400/10 text-orange-400",
    },
    COMPLETED: { label: "Approved", cls: "bg-emerald-400/10 text-emerald-400" },
  };
  const c = config[status] || config.IDLE;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}
