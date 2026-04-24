"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Comment {
  id: string;
  text: string;
  timestamp: number;
  createdAt: string | Date;
  user: { id: string; name: string | null; role: string };
}

interface TimestampCommentsProps {
  sessionId: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  currentUserId?: string;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function normalizeCreatedAt(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString();
}

export default function TimestampComments({
  sessionId,
  currentTime,
  duration,
  onSeek,
  currentUserId,
}: TimestampCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newText, setNewText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { getComments } = await import("@/app/actions/comments");
        const data = await getComments(sessionId);
        if (cancelled) return;
        setComments(
          data.map((c: { id: string; text: string; timestamp: number; createdAt: string | Date; user: { id: string; name: string | null; role: string } }) => ({
            ...c,
            createdAt: normalizeCreatedAt(c.createdAt),
          }))
        );
      } catch {
        // silently fail on load
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId]);

  const handleSubmit = () => {
    if (!newText.trim()) return;
    startTransition(async () => {
      try {
        const { addComment } = await import("@/app/actions/comments");
        const comment = await addComment(sessionId, newText, currentTime);
        setComments((prev) =>
          [
            ...prev,
            { ...comment, createdAt: normalizeCreatedAt(comment.createdAt) },
          ].sort((a, b) => a.timestamp - b.timestamp)
        );
        setNewText("");
      } catch (err) {
        console.error("Failed to add comment", err);
      }
    });
  };

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      try {
        const { deleteComment } = await import("@/app/actions/comments");
        await deleteComment(commentId);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } catch (err) {
        console.error("Failed to delete comment", err);
      }
    });
  };

  // Comments near current playback time (within 3 seconds)
  const nearbyComments = comments.filter(
    (c) => Math.abs(c.timestamp - currentTime) < 3
  );

  const visibleComments = showAll ? comments : nearbyComments;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Comments{" "}
          <span className="text-zinc-600">({comments.length})</span>
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setShowAll(true)}
            className={`rounded-md px-2 py-1 text-xs ${
              showAll
                ? "bg-gold/20 text-gold"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setShowAll(false)}
            className={`rounded-md px-2 py-1 text-xs ${
              !showAll
                ? "bg-gold/20 text-gold"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Current
          </button>
        </div>
      </div>

      {/* Timeline bar with markers */}
      {duration > 0 && (
        <div className="relative mb-4 h-6 rounded-full bg-zinc-800/50">
          {/* Progress indicator */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-zinc-800"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          {/* Comment markers */}
          {comments.map((c) => (
            <button
              key={c.id}
              onClick={() => onSeek(c.timestamp)}
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.5)] transition hover:scale-150 z-10"
              style={{ left: `${(c.timestamp / duration) * 100}%` }}
              title={`${formatTimestamp(c.timestamp)}: ${c.text}`}
            />
          ))}
        </div>
      )}

      {/* Add comment form */}
      <div className="mb-4 flex gap-2">
        <span className="shrink-0 rounded-md bg-zinc-800 px-2 py-1.5 text-xs font-mono text-gold">
          {formatTimestamp(currentTime)}
        </span>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Add a comment at this timestamp..."
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!newText.trim() || isPending}
          className="shrink-0 rounded-lg bg-gold/20 px-4 py-1.5 text-sm font-medium text-gold transition hover:bg-gold/30 disabled:opacity-40"
        >
          {isPending ? "..." : "Post"}
        </button>
      </div>

      {/* Comment list */}
      <div className="max-h-64 space-y-2 overflow-y-auto">
        <AnimatePresence>
          {visibleComments.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-600">
              {showAll
                ? "No comments yet. Be the first to comment!"
                : "No comments at this point in the video."}
            </p>
          ) : (
            visibleComments.map((comment) => {
              const isNearby = Math.abs(comment.timestamp - currentTime) < 3;
              const isOwn = comment.user.id === currentUserId;
              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`group flex gap-3 rounded-lg p-2.5 transition ${
                    isNearby
                      ? "bg-gold/5 border border-gold/20"
                      : "hover:bg-zinc-900"
                  }`}
                >
                  <button
                    onClick={() => onSeek(comment.timestamp)}
                    className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-gold hover:bg-gold/20 transition"
                  >
                    {formatTimestamp(comment.timestamp)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-zinc-300">
                        {comment.user.name || "Anonymous"}
                      </span>
                      {comment.user.role === "TEACHER" && (
                        <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                          TEACHER
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-400">
                      {comment.text}
                    </p>
                  </div>
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="shrink-0 rounded p-1 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
                      title="Delete"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
