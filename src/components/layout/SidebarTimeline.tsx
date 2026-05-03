"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLogout } from "@/components/layout/useLogout";

interface Session {
  id: string;
  title: string;
  order: number;
  isLocked?: boolean;
}

interface Week {
  id: string;
  number: number;
  title: string;
  isLocked: boolean;
  releaseAt: Date | string;
  sessions?: Session[];
}

interface SidebarTimelineProps {
  weeks: Week[];
  currentWeekId?: string;
  currentSessionId?: string;
  courseId: string;
}

export default function SidebarTimeline({
  weeks,
  currentWeekId,
  currentSessionId,
  courseId,
}: SidebarTimelineProps) {
  const { data: authSession } = useSession();
  const isManager = (authSession?.user as { role?: string } | undefined)?.role === "ADMIN";
  const { logout, isLogoutPending } = useLogout();

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>(() => {
    // Auto-expand the week containing the current session or the current week
    const initial: Record<string, boolean> = {};
    if (currentWeekId) initial[currentWeekId] = true;
    return initial;
  });

  function toggleWeek(weekId: string) {
    setExpandedWeeks((prev) => ({ ...prev, [weekId]: !prev[weekId] }));
  }

  async function handleLogout() {
    await logout();
  }

  return (
    <>
      {/* Mobile top header bar — hidden on desktop where the sidebar shows the name */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur-sm lg:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setIsMobileOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="flex-1 text-center text-sm font-semibold tracking-wide text-gold">
          Music Academy Pro
        </span>
        {/* Right spacer balances the hamburger so the name stays centred */}
        <span className="h-9 w-9 shrink-0" aria-hidden="true" />
      </header>

      {/* Backdrop overlay on mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-zinc-800 bg-zinc-950 p-6 transition-transform duration-300 ease-in-out lg:w-64 lg:translate-x-0 lg:z-40 ${
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
      {/* Logo */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gold">Music Academy Pro</h1>
          <p className="text-xs text-zinc-500">Studio Dashboard</p>
        </div>
        {/* Close button — mobile only */}
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMobileOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 lg:hidden"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Timeline */}
      <nav className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3 top-0 h-full w-px bg-zinc-800" />

          <ul className="space-y-1">
            {weeks.map((week, idx) => {
              const isCurrent = week.id === currentWeekId;
              const isLocked = week.isLocked;
              const isExpanded = !!expandedWeeks[week.id];
              const hasSessions = week.sessions && week.sessions.length > 0;

              return (
                <motion.li
                  key={week.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  {isLocked ? (
                    <div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 opacity-40">
                      <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-[10px] text-zinc-500">
                        🔒
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-zinc-500">
                          Session {new Date(week.releaseAt).toLocaleDateString("en-GB")}
                        </span>
                        <p className="text-xs text-zinc-600 truncate max-w-[140px]">
                          {week.title}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Week header — clickable accordion toggle */}
                      <button
                        type="button"
                        onClick={() => toggleWeek(week.id)}
                        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-gold/10"
                            : "hover:bg-zinc-800/50"
                        }`}
                      >
                        <span
                          className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-bold transition-all ${
                            isCurrent
                              ? "border-2 border-gold bg-gold/20 text-gold shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                              : "border border-zinc-600 bg-zinc-900 text-zinc-400 group-hover:border-zinc-500"
                          }`}
                        >
                          {new Date(week.releaseAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span
                            className={`text-sm font-medium ${
                              isCurrent ? "text-gold" : "text-zinc-300"
                            }`}
                          >
                            Session {new Date(week.releaseAt).toLocaleDateString("en-GB")}
                          </span>
                          <p className="text-xs text-zinc-500 truncate max-w-[140px]">
                            {week.title}
                          </p>
                        </div>
                        {hasSessions && (
                          <svg
                            className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                        {isCurrent && !hasSessions && (
                          <motion.div
                            layoutId="active-indicator"
                            className="ml-auto h-1.5 w-1.5 rounded-full bg-gold"
                          />
                        )}
                      </button>

                      {/* Sessions sub-menu */}
                      {isExpanded && hasSessions && (
                        <ul className="ml-9 mt-0.5 space-y-0.5 border-l border-zinc-800 pl-3">
                          {week.sessions!.map((s) => {
                            const isActiveSession = s.id === currentSessionId;
                            if (s.isLocked) {
                              return (
                                <li key={s.id}>
                                  <span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-600 opacity-50">
                                    🔒 {s.title}
                                  </span>
                                </li>
                              );
                            }
                            return (
                              <li key={s.id}>
                                <Link
                                  href={`/dashboard/course/${courseId}/week/${week.id}/session/${s.id}`}
                                  onClick={() => setIsMobileOpen(false)}
                                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition ${
                                    isActiveSession
                                      ? "bg-gold/10 text-gold font-medium"
                                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                                  }`}
                                >
                                  <span className={`h-1 w-1 rounded-full shrink-0 ${isActiveSession ? "bg-gold" : "bg-zinc-600"}`} />
                                  <span className="truncate">{s.title}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="mt-4 border-t border-zinc-800 pt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/dashboard/settings"
              className="text-xs text-zinc-500 transition hover:text-zinc-300"
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLogoutPending}
              className="text-xs text-zinc-500 transition hover:text-red-300 disabled:opacity-50"
            >
              {isLogoutPending ? "Signing out..." : "Logout"}
            </button>
          </div>
          {isManager && (
            <Link
              href="/dashboard/manager"
              className="block text-xs text-gold/70 transition hover:text-gold"
            >
              Manage Teachers
            </Link>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
