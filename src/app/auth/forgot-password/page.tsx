"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gold">Reset Password</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Enter your email to receive a reset link
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-emerald-500/10 p-4 text-center text-sm text-emerald-400">
            If an account exists with that email, a reset link has been sent.
            Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-primary placeholder-zinc-600 outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gold py-2.5 text-sm font-bold text-black transition hover:bg-gold/90 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-zinc-500">
          <Link href="/auth/login" className="text-gold/80 hover:text-gold">
            Back to Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
