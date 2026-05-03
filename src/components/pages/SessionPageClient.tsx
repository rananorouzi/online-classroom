"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import SidebarTimeline from "@/components/layout/SidebarTimeline";
import Checklist from "@/components/ui/Checklist";
import { uploadMediaFile } from "@/lib/client-upload";
import Breadcrumb from "@/components/layout/Breadcrumb";

const MemoizedSidebar = memo(SidebarTimeline);
const MemoizedChecklist = memo(Checklist);

const HlsPlayer = dynamic(() => import("@/components/media/HlsPlayer"), {
  ssr: false,
  loading: () => <div className="aspect-video w-full rounded-xl bg-zinc-900 animate-pulse" />,
});
const WaveformPlayer = dynamic(() => import("@/components/media/WaveformPlayer"), {
  ssr: false,
  loading: () => <div className="h-16 rounded-lg bg-zinc-900 animate-pulse" />,
});
const StyledAudioPlayer = dynamic(() => import("@/components/media/StyledAudioPlayer"), { ssr: false });
const TimestampComments = dynamic(() => import("@/components/ui/TimestampComments"), { ssr: false });
const TeacherReviewPanel = dynamic(() => import("@/components/ui/TeacherReviewPanel"), { ssr: false });
const SubmitWorkPanel = dynamic(() => import("@/components/ui/SubmitWorkPanel"), { ssr: false });

interface SessionPageClientProps {
  weeks: {
    id: string;
    number: number;
    title: string;
    isLocked: boolean;
    releaseAt: Date | string;
    sessions?: {
      id: string;
      title: string;
      order: number;
      isLocked?: boolean;
    }[];
  }[];
  session: {
    id: string;
    title: string;
    description: string | null;
    videoKey: string | null;
    attachmentKey?: string | null;
    week: { id: string; number: number; title: string; releaseAt: Date | string };
    checklistItems: {
      id: string;
      title: string;
      description: string | null;
      order: number;
      submissions: {
        id: string;
        status: "IDLE" | "PENDING" | "REVISION" | "COMPLETED";
        createdAt: string;
        fileKey: string | null;
        fileName: string | null;
        fileType: string | null;
        student?: { id: string; name: string | null; email: string };
        feedbacks: {
          comment: string | null;
          audioKey: string | null;
          waveformJson: number[] | null;
          createdAt: string;
        }[];
      }[];
    }[];
  };
  courseId: string;
  currentUserId?: string;
  userRole?: string;
  courseTitle?: string;
}

function inferMediaKindFromKey(key: string | null): "video" | "image" | "pdf" | "file" | "none" {
  if (!key) return "none";
  const lower = key.toLowerCase();
  if (lower.endsWith(".m3u8") || lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov") || lower.endsWith(".m4v")) return "video";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif") || lower.endsWith(".avif") || lower.endsWith(".svg")) return "image";
  if (lower.endsWith(".pdf")) return "pdf";
  return "file";
}

function parseAttachmentKeys(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function SessionPageClient({
  weeks,
  session,
  courseId,
  currentUserId,
  userRole,
  courseTitle = "Course",
}: SessionPageClientProps) {
  const isTeacher = userRole === "TEACHER";
  const lessonMediaKind = inferMediaKindFromKey(session.videoKey);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [uploadItemId, setUploadItemId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const seekRef = useRef<((time: number) => void) | null>(null);
  const uploadPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!uploadItemId || isTeacher) return;
    const timer = setTimeout(() => {
      uploadPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(timer);
  }, [uploadItemId, isTeacher]);

  const handleTimeUpdate = useCallback((ct: number, dur: number) => {
    setVideoTime(ct);
    setVideoDuration(dur);
  }, []);

  const handleSeek = useCallback((time: number) => {
    seekRef.current?.(time);
  }, []);

  const selectedItem = session.checklistItems.find((i) => i.id === selectedItemId);
  const latestFeedback = selectedItem?.submissions[0]?.feedbacks[0];
  const lessonAttachmentKeys = parseAttachmentKeys(session.attachmentKey);

  const handleUploadComplete = async (fileKey: string, fileName: string, fileType: string) => {
    if (!uploadItemId) return;
    setIsUploading(true);
    try {
      const { submitWork } = await import("@/app/actions/submissions");
      await submitWork(uploadItemId, fileKey, fileName, fileType);
      setSubmitNotice("Work submitted successfully.");
      setUploadItemId(null);
    } catch (err) {
      console.error("Submit failed", err);
      setSubmitNotice("Submission failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRecordingComplete = async (blob: Blob, type: "audio" | "video") => {
    if (!uploadItemId) return;
    setIsUploading(true);
    try {
      const ext = type === "audio" ? "webm" : "webm";
      const fileType = type === "audio" ? "audio/webm" : "video/webm";
      const data = await uploadMediaFile({
        file: blob,
        fileName: `recording.${ext}`,
        contentType: fileType,
        folder: "submissions",
      });
      const { submitWork } = await import("@/app/actions/submissions");
      await submitWork(uploadItemId, data.key, data.fileName, data.fileType);
      setSubmitNotice(
        type === "audio"
          ? "Voice recording submitted successfully."
          : "Video recording submitted successfully."
      );
      setUploadItemId(null);
    } catch (err) {
      console.error("Submit failed", err);
      setSubmitNotice("Submission failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <MemoizedSidebar
        weeks={weeks}
        currentWeekId={session.week.id}
        currentSessionId={session.id}
        courseId={courseId}
      />

      <main className="flex-1 p-4 pt-[3.75rem] lg:ml-64 lg:p-8 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: courseTitle, href: `/dashboard/course/${courseId}` },
              { label: session.week.title, href: `/dashboard/course/${courseId}/week/${session.week.id}` },
              { label: session.title },
            ]}
          />
          <h2 className="mt-1 text-2xl font-bold text-primary">{session.title}</h2>
          {session.description && <p className="mt-2 text-sm text-zinc-400">{session.description}</p>}
          {submitNotice && (
            <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
              submitNotice.toLowerCase().includes("failed")
                ? "border-red-500/20 bg-red-500/10 text-red-300"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            }`}>
              {submitNotice}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            {/* Lesson media */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Lesson Material</h3>
              <HlsPlayer sessionId={session.id} videoKey={session.videoKey} onTimeUpdate={handleTimeUpdate} seekRef={seekRef} />
            </section>

            {/* Timestamp Comments — always immediately after the video */}
            {lessonMediaKind === "video" && (
              <section>
                <TimestampComments sessionId={session.id} currentTime={videoTime} duration={videoDuration} onSeek={handleSeek} currentUserId={currentUserId} />
              </section>
            )}

            {lessonAttachmentKeys.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Lesson Attachments ({lessonAttachmentKeys.length})
                </h3>
                <div className="space-y-3">
                  {lessonAttachmentKeys.map((key, idx) => (
                    <LessonAttachment key={`${key}-${idx}`} attachmentKey={key} />
                  ))}
                </div>
              </section>
            )}

            {/* Teacher Feedback Waveform */}
            {latestFeedback?.audioKey && (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Teacher Feedback</h3>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <WaveformPlayer audioKey={latestFeedback.audioKey} peaks={latestFeedback.waveformJson} />
                  {latestFeedback.comment && <p className="mt-3 text-sm text-zinc-300">{latestFeedback.comment}</p>}
                </div>
              </section>
            )}

            {/* Student submissions */}
            {!isTeacher && selectedItem && selectedItem.submissions.length > 0 && (
              <SubmissionsList submissions={selectedItem.submissions} />
            )}

            {/* Teacher Review */}
            {isTeacher && selectedItem && selectedItem.submissions.length > 0 && (
              <section>
                <TeacherReviewPanel
                  submissions={selectedItem.submissions.map((s) => ({
                    ...s,
                    student: s.student || { id: "", name: "Student", email: "" },
                  }))}
                  checklistItemTitle={selectedItem.title}
                />
              </section>
            )}

            {/* Submit Work */}
            {!isTeacher && uploadItemId && (
              <div ref={uploadPanelRef}>
                <SubmitWorkPanel
                  isUploading={isUploading}
                  onUploadComplete={handleUploadComplete}
                  onRecordingComplete={handleRecordingComplete}
                  onCancel={() => setUploadItemId(null)}
                />
              </div>
            )}
          </div>

          <div>
            <MemoizedChecklist
              items={session.checklistItems}
              onUpload={(itemId) => {
                setSelectedItemId(itemId);
                setSubmitNotice(null);
                setUploadItemId(itemId);
              }}
              onSelect={(itemId) => setSelectedItemId(itemId)}
              selectedId={selectedItemId}
              hideUpload={isTeacher}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Extracted sub-component ── */

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  COMPLETED: { color: "text-emerald-400", label: "Approved" },
  PENDING: { color: "text-amber-400", label: "Pending" },
  REVISION: { color: "text-orange-400", label: "Needs Revision" },
};

function SubmissionsList({ submissions }: {
  submissions: SessionPageClientProps["session"]["checklistItems"][number]["submissions"];
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Your Submissions ({submissions.length})
      </h3>
      <div className="space-y-3">
        {submissions.map((sub, idx) => (
          <div key={sub.id || idx} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-zinc-500">{sub.fileName || "Uploaded file"}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-600">
                  Submitted {new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                {sub.feedbacks.length > 0 && (
                  <span className="text-[10px] text-zinc-600">
                    · Reviewed {new Date(sub.feedbacks[0].createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {STATUS_STYLES[sub.status] && (
                  <span className={`text-[10px] font-medium ${STATUS_STYLES[sub.status].color}`}>
                    {STATUS_STYLES[sub.status].label}
                  </span>
                )}
                {sub.status === "PENDING" && (
                  <button
                    onClick={async () => {
                      try {
                        const { deleteSubmission } = await import("@/app/actions/submissions");
                        await deleteSubmission(sub.id);
                      } catch (err) { console.error("Delete failed", err); }
                    }}
                    className="rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10 transition"
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <SubmissionMedia fileKey={sub.fileKey} fileType={sub.fileType} fileName={sub.fileName} />

            {sub.feedbacks.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Teacher Feedback</p>
                {sub.feedbacks.map((fb, fIdx) => (
                  <div key={fIdx} className="rounded-lg bg-zinc-900 border border-zinc-700 p-3 space-y-2">
                    {fb.comment && <p className="text-sm text-zinc-300">{fb.comment}</p>}
                    {fb.audioKey && (
                      <StyledAudioPlayer
                        src={fb.audioKey.startsWith("uploads/") ? `/${fb.audioKey}` : `/api/media/download?key=${encodeURIComponent(fb.audioKey)}`}
                        compact
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function LessonAttachment({ attachmentKey }: { attachmentKey: string }) {
  const lower = attachmentKey.toLowerCase();
  const isPdf = lower.endsWith(".pdf");
  const isImage = lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif") || lower.endsWith(".avif") || lower.endsWith(".svg");
  const src = attachmentKey.startsWith("uploads/") ? `/${attachmentKey}` : `/api/media/download?key=${encodeURIComponent(attachmentKey)}`;
  const [showPreview, setShowPreview] = useState(true);

  if (!isPdf && !isImage) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-xs text-zinc-500">Attachment</p>
        <a href={src} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-gold hover:underline">
          Open in new tab
        </a>
        <a href={src} download className="ml-3 inline-block text-sm text-zinc-300 hover:text-zinc-100">
          Download
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          {isPdf ? "PDF attachment" : "Image attachment"}
        </p>
        <button
          onClick={() => setShowPreview((v) => !v)}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          {showPreview ? "Hide preview" : "Show preview"}
        </button>
      </div>

      <div className="mt-2">
        <a href={src} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-gold hover:underline">
          Open in new tab
        </a>
        <a href={src} download className="ml-3 inline-block text-sm text-zinc-300 hover:text-zinc-100">
          Download
        </a>
      </div>

      {showPreview && (
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          {isPdf ? (
            <iframe src={src} title="Lesson attachment PDF preview" className="h-96 w-full" />
          ) : (
            <Image
              src={src}
              alt="Lesson attachment preview"
              width={1600}
              height={1000}
              unoptimized
              className="max-h-[32rem] w-full object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionMedia({ fileKey, fileType, fileName }: { fileKey: string | null; fileType: string | null; fileName: string | null }) {
  const [showPreview, setShowPreview] = useState(true);
  if (!fileKey) return null;
  const src = fileKey.startsWith("uploads/") ? `/${fileKey}` : `/api/media/download?key=${encodeURIComponent(fileKey)}`;
  const isPdf = fileType === "application/pdf";
  const isImage = !!fileType?.startsWith("image/");

  if (fileType?.startsWith("video/"))
    return <video src={src} controls className="w-full rounded-lg" style={{ maxHeight: 300 }} />;
  if (fileType?.startsWith("audio/"))
    return <StyledAudioPlayer src={src} />;
  if (isImage || isPdf)
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">{isPdf ? "PDF file" : "Image file"}</p>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
        </div>
        <div className="mt-1">
          <a href={src} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-gold hover:underline">
            Open in new tab
          </a>
          <a href={src} download className="ml-3 inline-block text-sm text-zinc-300 hover:text-zinc-100">
            Download
          </a>
        </div>
        {showPreview && (
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            {isPdf ? (
              <iframe src={src} title={fileName || "Submitted PDF preview"} className="h-80 w-full" />
            ) : (
              <Image
                src={src}
                alt={fileName || "Submitted image preview"}
                width={1400}
                height={900}
                unoptimized
                className="max-h-[24rem] w-full object-contain"
              />
            )}
          </div>
        )}
      </div>
    );
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="text-sm text-gold hover:underline">
      Download {fileName}
    </a>
  );
}
