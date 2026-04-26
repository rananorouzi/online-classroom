"use client";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function DashboardSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
