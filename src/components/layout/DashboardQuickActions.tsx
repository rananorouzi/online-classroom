"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTransition } from "react";

export default function DashboardQuickActions() {
  const [isLogoutPending, startLogoutTransition] = useTransition();

  function handleLogout() {
    startLogoutTransition(async () => {
      await signOut({ callbackUrl: "/auth/login" });
    });
  }

  return (
    <div className="fixed right-4 top-4 z-[90]">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-800/90 bg-zinc-950/95 px-2 py-2 shadow-lg backdrop-blur-sm">
        <Link
          href="/dashboard/settings"
          className="rounded-md px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-primary"
        >
          Settings
        </Link>
        <button
          onClick={handleLogout}
          disabled={isLogoutPending}
          className="rounded-md px-2 py-1 text-xs text-zinc-300 transition hover:bg-red-950/40 hover:text-red-300 disabled:opacity-50"
        >
          {isLogoutPending ? "Signing out..." : "Logout"}
        </button>
      </div>
    </div>
  );
}