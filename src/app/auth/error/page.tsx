"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    CredentialsSignin: "Invalid email or password.",
    MAX_SESSIONS_REACHED:
      "Too many active sessions. Please log out from another device.",
    Default: "An authentication error occurred.",
  };

  const message = errorMessages[error || ""] || errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-red-400">Auth Error</h1>
        <p className="mt-3 text-sm text-zinc-400">{message}</p>
        <Link
          href="/auth/login"
          className="mt-6 inline-block rounded-lg bg-gold px-6 py-2 text-sm font-bold text-black transition hover:bg-gold/90"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
