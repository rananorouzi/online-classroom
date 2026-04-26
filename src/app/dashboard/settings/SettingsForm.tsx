"use client";

import { useState, useTransition } from "react";
import { updateProfile, changePassword } from "@/app/actions/settings";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface SettingsFormProps {
  user: { id: string; name: string | null; email: string; role: string };
}

export default function SettingsForm({ user }: SettingsFormProps) {
  const [name, setName] = useState(user.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLogoutPending, setIsLogoutPending] = useState(false);

  const handleUpdateProfile = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateProfile(name);
        setMessage({ type: "success", text: "Profile updated" });
      } catch (e) {
        setMessage({ type: "error", text: (e as Error).message });
      }
    });
  };

  const handleChangePassword = () => {
    setMessage(null);
    if (!currentPassword || !newPassword) {
      setMessage({ type: "error", text: "Both fields are required" });
      return;
    }
    startTransition(async () => {
      try {
        await changePassword(currentPassword, newPassword);
        setCurrentPassword("");
        setNewPassword("");
        setMessage({ type: "success", text: "Password changed" });
      } catch (e) {
        setMessage({ type: "error", text: (e as Error).message });
      }
    });
  };

  const handleLogout = async () => {
    setMessage(null);
    setIsLogoutPending(true);
    try {
      await signOut({ callbackUrl: "/auth/login" });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to sign out",
      });
    } finally {
      setIsLogoutPending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Back link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition"
          >
            ← Back to Dashboard
          </Link>
          {user.role === "ADMIN" && (
            <Link
              href="/dashboard/manager"
              className="inline-flex items-center gap-1 text-sm text-gold/70 hover:text-gold transition"
            >
              Manage Teachers
            </Link>
          )}
        </div>
        <button
          onClick={handleLogout}
          disabled={isLogoutPending}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-red-900/50 hover:text-red-300 disabled:opacity-50"
        >
          {isLogoutPending ? "Signing out..." : "Logout"}
        </button>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Profile section */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-lg font-semibold text-primary mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="settings-email" className="block text-xs font-medium text-zinc-400 mb-1">
                Email
              </label>
              <p id="settings-email" className="text-sm text-zinc-300">{user.email}</p>
            </div>
            <div>
              <label htmlFor="settings-role" className="block text-xs font-medium text-zinc-400 mb-1">
                Role
              </label>
              <span id="settings-role" className="inline-block rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold">
                {user.role}
              </span>
            </div>
            <div>
              <label htmlFor="settings-name" className="block text-xs font-medium text-zinc-400 mb-1">
                Name
              </label>
              {user.role === "STUDENT" ? (
                <p id="settings-name" className="text-sm text-zinc-300">{user.name || "—"}</p>
              ) : (
                <input
                  id="settings-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-gold focus:outline-none"
                />
              )}
            </div>
            {user.role !== "STUDENT" && (
              <button
                onClick={handleUpdateProfile}
                disabled={isPending}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-gold/90 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Profile"}
              </button>
            )}
          </div>
        </section>

        {/* Password section */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-lg font-semibold text-primary mb-4">Change Password</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="settings-current-password" className="block text-xs font-medium text-zinc-400 mb-1">
                Current Password
              </label>
              <input
                id="settings-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="settings-new-password" className="block text-xs font-medium text-zinc-400 mb-1">
                New Password
              </label>
              <input
                id="settings-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-gold focus:outline-none"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={isPending}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              {isPending ? "Changing..." : "Change Password"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
