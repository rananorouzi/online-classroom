"use client";

import { motion, AnimatePresence } from "framer-motion";

const SubmissionStatus = {
  IDLE: "IDLE",
  PENDING: "PENDING",
  REVISION: "REVISION",
  COMPLETED: "COMPLETED",
} as const;

type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

interface ChecklistItemData {
  id: string;
  title: string;
  description: string | null;
  order: number;
  submissions: {
    id: string;
    status: SubmissionStatus;
    feedbacks: { comment: string | null; audioKey: string | null }[];
  }[];
}

interface ChecklistProps {
  items: ChecklistItemData[];
  onUpload: (itemId: string) => void;
  onSelect: (itemId: string) => void;
  onDelete?: (submissionId: string) => void;
  selectedId?: string;
  hideUpload?: boolean;
}

const statusConfig: Record<
  SubmissionStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  IDLE: { label: "Not Started", color: "text-zinc-500", bg: "bg-zinc-800", icon: "○" },
  PENDING: {
    label: "Pending Review",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    icon: "◉",
  },
  REVISION: {
    label: "Needs Revision",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    icon: "↺",
  },
  COMPLETED: {
    label: "Approved",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    icon: "✓",
  },
};

export default function Checklist({
  items,
  onUpload,
  onSelect,
  selectedId,
  hideUpload,
}: ChecklistProps) {
  return (
    <div className="space-y-2">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Checklist
      </h3>
      <AnimatePresence>
        {items.map((item) => {
          const submission = item.submissions[0];
          const latestStatus = submission?.status || SubmissionStatus.IDLE;
          const config = statusConfig[latestStatus];
          const isSelected = item.id === selectedId;
          const hasApproved = item.submissions.some((s) => s.status === SubmissionStatus.COMPLETED);
          const subCount = item.submissions.length;

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`group relative cursor-pointer rounded-lg border p-3 transition-all ${
                isSelected
                  ? "border-gold/50 bg-gold/5"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
              }`}
              onClick={() => onSelect(item.id)}
            >
              {/* Gold sparkle on completion */}
              {hasApproved && (
                <GoldSparkle />
              )}

              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${hideUpload ? "bg-zinc-800 text-zinc-400" : config.bg + " " + config.color}`}
                >
                  {hideUpload ? (subCount > 0 ? "📋" : "○") : config.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-zinc-500 truncate">
                      {item.description}
                    </p>
                  )}
                  <span className={`mt-1 inline-block text-[10px] font-medium ${hideUpload ? "text-zinc-400" : config.color}`}>
                    {hideUpload
                      ? (subCount > 0 ? `${subCount} submission${subCount > 1 ? "s" : ""} to review` : "No submissions")
                      : <>{config.label}{subCount > 0 && ` · ${subCount} submission${subCount > 1 ? "s" : ""}`}</>}
                  </span>
                </div>

                {!hideUpload && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpload(item.id);
                      }}
                      className="rounded-md bg-gold/20 px-3 py-1 text-xs font-medium text-gold transition hover:bg-gold/30"
                    >
                      {subCount === 0 ? "Submit" : "+ Add"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Pre-computed sparkle positions so we avoid Math.random during render */
const SPARKLE_POSITIONS = Array.from({ length: 6 }, () => ({
  ix: `${20 + Math.random() * 60}%`,
  iy: `${20 + Math.random() * 60}%`,
  ay: `${Math.random() * 40}%`,
}));

/** Subtle gold sparkle effect for approved items */
function GoldSparkle() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {SPARKLE_POSITIONS.map((pos, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-gold"
          initial={{
            x: pos.ix,
            y: pos.iy,
            scale: 0,
            opacity: 1,
          }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [1, 0.8, 0],
            y: pos.ay,
          }}
          transition={{
            duration: 1.2,
            delay: i * 0.15,
            ease: "easeOut",
          }}
        />
      ))}
    </motion.div>
  );
}
