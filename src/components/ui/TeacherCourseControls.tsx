"use client";

import { useState, useTransition } from "react";
import {
  createWeek,
  updateWeek,
  deleteWeek,
  createSession,
  updateSession,
  deleteSession,
  createChecklistItem,
  updateSessionVideo,
  updateSessionAttachment,
  removeSessionAttachment,
} from "@/app/actions/teacher";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadMediaFile } from "@/lib/client-upload";

function parseAttachmentKeys(value: string | null): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

interface TeacherCourseControlsProps {
  courseId: string;
  weeks: {
    id: string;
    number: number;
    title: string;
    releaseAt: Date | string;
    sessions: {
      id: string;
      title: string;
      order: number;
      videoKey: string | null;
      attachmentKey: string | null;
      _count: { checklistItems: number };
    }[];
  }[];
}

export default function TeacherCourseControls({
  courseId,
  weeks,
}: TeacherCourseControlsProps) {
  return (
    <div className="space-y-4">
      <AddWeekForm courseId={courseId} />

      {weeks.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-12 text-center text-sm text-zinc-500">
          No weeks created yet. Add one above.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden divide-y divide-zinc-800">
          {weeks.map((week) => (
            <WeekRow key={week.id} week={week} courseId={courseId} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddWeekForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const handleCreate = () => {
    if (!title.trim()) return;
    setMsg(null);
    startTransition(async () => {
      try {
        await createWeek(courseId, title);
        router.refresh();
        setTitle("");
        setOpen(false);
        setMsg("Week created!");
      } catch (e) {
        setMsg((e as Error).message);
      }
    });
  };

  return (
    <div className="rounded-xl border border-dashed border-gold/30 bg-gold/5 p-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-gold hover:text-gold/80 transition"
        >
          <span className="text-lg">+</span> Add New Week
        </button>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Week title (e.g. Advanced Chord Voicings)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-gold focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={isPending || !title.trim()}
              className="rounded-lg bg-gold px-4 py-2 text-xs font-medium text-zinc-900 transition hover:bg-gold/90 disabled:opacity-50"
            >
              {isPending ? "Creating..." : "Create Week"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setTitle("");
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
          {msg && <p className="text-xs text-emerald-400">{msg}</p>}
        </div>
      )}
    </div>
  );
}

function WeekRow({
  week,
  courseId,
}: {
  week: TeacherCourseControlsProps["weeks"][number];
  courseId: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [weekTitle, setWeekTitle] = useState(week.title);
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleCreate = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        await createSession(week.id, title, description);
        router.refresh();
        setTitle("");
        setDescription("");
        setShowAdd(false);
        setStatusMsg("Session created.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to create session.";
        setStatusMsg(msg);
      }
    });
  };

  const handleUpdateWeek = () => {
    if (!weekTitle.trim()) return;
    startTransition(async () => {
      try {
        await updateWeek(week.id, weekTitle);
        router.refresh();
        setShowEdit(false);
        setStatusMsg("Week updated.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to update week.";
        setStatusMsg(msg);
      }
    });
  };

  const handleDeleteWeek = () => {
    const ok = window.confirm("Delete this week and all sessions under it?");
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteWeek(week.id);
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to delete week.";
        setStatusMsg(msg);
      }
    });
  };

  return (
    <div>
      {/* Accordion Header – always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer hover:bg-zinc-900/50 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-[9px] font-bold text-gold leading-tight text-center">
            {new Date(week.releaseAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-zinc-200">
              Session {new Date(week.releaseAt).toLocaleDateString("en-GB")}: {week.title}
            </h3>
            <p className="text-[10px] text-zinc-500">
              {week.sessions.length} session{week.sessions.length !== 1 && "s"}
              {" · "}
              Released{" "}
              {new Date(week.releaseAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Accordion Body – collapsible */}
      {expanded && (
        <div className="border-t border-zinc-800/50 px-5 pb-4">
          <div className="ml-11 mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
            {!showEdit ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-zinc-400">Manage week</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setWeekTitle(week.title);
                      setShowEdit(true);
                    }}
                    className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-gold hover:text-gold transition cursor-pointer"
                  >
                    Edit Week
                  </button>
                  <button
                    onClick={handleDeleteWeek}
                    disabled={isPending}
                    className="rounded-md border border-red-900/50 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40 transition disabled:opacity-50 cursor-pointer"
                  >
                    Delete Week
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={weekTitle}
                  onChange={(e) => setWeekTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-gold focus:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateWeek()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateWeek}
                    disabled={isPending || !weekTitle.trim()}
                    className="rounded-md bg-gold px-3 py-1 text-xs font-medium text-zinc-900 disabled:opacity-50 cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowEdit(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sessions */}
          {week.sessions.length > 0 && (
            <div className="mt-3 ml-11 space-y-1.5">
              {week.sessions.map((s) => (
                <SessionRow key={s.id} session={s} courseId={courseId} weekId={week.id} />
              ))}
            </div>
          )}

          {/* Add session */}
          <div className="mt-2 ml-11">
            {!showAdd ? (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1 text-xs text-gold/70 hover:text-gold transition cursor-pointer"
              >
                <span>+</span> Add Session
              </button>
            ) : (
              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <input
                  type="text"
                  placeholder="Session title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-gold focus:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-gold focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={isPending || !title.trim()}
                    className="rounded-md bg-gold px-3 py-1 text-xs font-medium text-zinc-900 disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? "..." : "Create"}
                  </button>
                  <button
                    onClick={() => setShowAdd(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {statusMsg && <p className="ml-11 mt-2 text-[11px] text-zinc-400">{statusMsg}</p>}
        </div>
      )}
    </div>
  );
}

function SessionRow({
  session,
  courseId,
  weekId,
}: {
  session: { id: string; title: string; order: number; videoKey: string | null; attachmentKey: string | null; _count: { checklistItems: number } };
  courseId: string;
  weekId: string;
}) {
  const router = useRouter();
  const [showChecklist, setShowChecklist] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const [itemTitle, setItemTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [videoUploading, setVideoUploading] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recentUploadUrl, setRecentUploadUrl] = useState<string | null>(null);
  const [recentAttachmentUrl, setRecentAttachmentUrl] = useState<string | null>(null);

  const handleAddItem = () => {
    if (!itemTitle.trim()) return;
    startTransition(async () => {
      try {
        await createChecklistItem(session.id, itemTitle);
        router.refresh();
        setItemTitle("");
      } catch {
        // silently handle
      }
    });
  };

  const handleUpdateSession = () => {
    if (!editTitle.trim()) return;
    startTransition(async () => {
      try {
        await updateSession(session.id, editTitle);
        router.refresh();
        setShowEdit(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to update session.";
        setUploadError(msg);
      }
    });
  };

  const handleDeleteSession = () => {
    const ok = window.confirm("Delete this session?");
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteSession(session.id);
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to delete session.";
        setUploadError(msg);
      }
    });
  };

  const attachmentKeys = parseAttachmentKeys(session.attachmentKey);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMsg(null);
    setUploadError(null);
    setVideoUploading(true);
    try {
      const data = await uploadMediaFile({
        file,
        fileName: file.name,
        contentType: file.type,
        folder: `lessons/${session.id}`,
      });
      // show immediate preview
      if (data.url) setRecentUploadUrl(data.url);
      await updateSessionVideo(session.id, data.key);
      router.refresh();
      setUploadMsg("Video uploaded successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
      setUploadError(msg);
    } finally {
      setVideoUploading(false);
      setShowVideo(false);
    }
  };

  return (
    <div className="rounded-lg bg-zinc-900/50 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-zinc-600">
            {session.order}.
          </span>
          <Link
            href={`/dashboard/course/${courseId}/week/${weekId}/session/${session.id}`}
            className="truncate text-sm text-zinc-300 hover:text-gold transition"
          >
            {session.title}
          </Link>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {session.videoKey ? (
            <span className="text-[10px] text-emerald-400">🎬 Video</span>
          ) : (
            <span className="text-[10px] text-zinc-600">No video</span>
          )}
          {session.attachmentKey && (
            <span className="text-[10px] text-blue-400">📎 Attachment</span>
          )}
          <span className="text-[10px] text-zinc-500">
            {session._count.checklistItems} item{session._count.checklistItems !== 1 && "s"}
          </span>
          <button
            onClick={() => setShowVideo(!showVideo)}
            className="text-[10px] text-zinc-500 hover:text-gold transition cursor-pointer"
            title="Upload lesson video"
          >
            🎬
          </button>
          <button
            onClick={() => setShowAttachment(!showAttachment)}
            className="text-[10px] text-zinc-500 hover:text-gold transition cursor-pointer"
            title="Upload lesson attachment (PDF/Image)"
          >
            📎
          </button>
          <button
            onClick={() => setShowChecklist(!showChecklist)}
            className="text-[10px] text-zinc-500 hover:text-gold transition cursor-pointer"
            title="Add checklist item"
          >
            ✓
          </button>
          <button
            onClick={() => {
              setEditTitle(session.title);
              setShowEdit(!showEdit);
            }}
            className="text-[10px] text-zinc-500 hover:text-gold transition cursor-pointer"
            title="Edit session title"
          >
            ✎
          </button>
          <button
            onClick={handleDeleteSession}
            className="text-[10px] text-zinc-500 hover:text-red-400 transition cursor-pointer"
            title="Delete session"
          >
            🗑
          </button>
        </div>
      </div>

      {showEdit && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-gold focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleUpdateSession()}
          />
          <button
            onClick={handleUpdateSession}
            disabled={isPending || !editTitle.trim()}
            className="rounded-md bg-gold px-2 py-1 text-xs font-medium text-zinc-900 disabled:opacity-50 cursor-pointer"
          >
            Save
          </button>
        </div>
      )}

      {showVideo && (
        <div className="mt-2 flex items-center gap-2">
          <label className="cursor-pointer rounded-md bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700 transition">
            {videoUploading ? "Uploading..." : "Choose Video"}
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
              disabled={videoUploading}
            />
          </label>
          {recentUploadUrl && !videoUploading && (
            <div className="ml-3">
              <video src={recentUploadUrl} controls className="h-24 rounded-md" />
            </div>
          )}
        </div>
      )}

      {showAttachment && (
        <div className="mt-2 flex items-center gap-2">
          <label className="cursor-pointer rounded-md bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700 transition">
            {attachmentUploading ? "Uploading..." : "Choose PDF/Image"}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadMsg(null);
                setUploadError(null);
                setAttachmentUploading(true);
                try {
                  const data = await uploadMediaFile({
                    file,
                    fileName: file.name,
                    contentType: file.type,
                    folder: `lessons/${session.id}`,
                  });
                  if (data.url) setRecentAttachmentUrl(data.url);
                  await updateSessionAttachment(session.id, data.key);
                  router.refresh();
                  setUploadMsg("Attachment uploaded successfully.");
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
                  setUploadError(msg);
                } finally {
                  setAttachmentUploading(false);
                  setShowAttachment(false);
                }
              }}
              className="hidden"
              disabled={attachmentUploading}
            />
          </label>
          {recentAttachmentUrl && !attachmentUploading && (
            <div className="ml-3">
              {file?.type?.startsWith?.("image") ? (
                <img src={recentAttachmentUrl} alt="attachment" className="h-12 rounded-md" />
              ) : (
                <a href={recentAttachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gold underline">
                  View uploaded file
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {showChecklist && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder="Checklist item title"
            value={itemTitle}
            onChange={(e) => setItemTitle(e.target.value)}
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-gold focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
          />
          <button
            onClick={handleAddItem}
            disabled={isPending || !itemTitle.trim()}
            className="rounded-md bg-gold px-2 py-1 text-xs font-medium text-zinc-900 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "..." : "Add"}
          </button>
        </div>
      )}

      {attachmentKeys.length > 0 && (
        <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-2">
          <p className="mb-1 text-[10px] text-zinc-500">Attachments</p>
          <div className="space-y-1">
            {attachmentKeys.map((key) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-zinc-400">{key.split("/").pop() || key}</span>
                <button
                  onClick={async () => {
                    setUploadError(null);
                    setUploadMsg(null);
                    try {
                      await removeSessionAttachment(session.id, key);
                      router.refresh();
                      setUploadMsg("Attachment removed.");
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : "Failed to remove attachment.";
                      setUploadError(msg);
                    }
                  }}
                  className="rounded border border-red-900/50 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-950/40 transition cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadMsg && (
        <p className="mt-2 text-[11px] text-emerald-400">{uploadMsg}</p>
      )}
      {uploadError && (
        <p className="mt-2 text-[11px] text-red-400">{uploadError}</p>
      )}
    </div>
  );
}
