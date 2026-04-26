"use client";

import { useCallback, useState } from "react";
import { signOut } from "next-auth/react";

type LogoutResult =
  | { ok: true }
  | { ok: false; error: string };

export function useLogout() {
  const [isLogoutPending, setIsLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const clearLogoutError = useCallback(() => {
    setLogoutError(null);
  }, []);

  const logout = useCallback(async (): Promise<LogoutResult> => {
    setLogoutError(null);
    setIsLogoutPending(true);

    try {
      await signOut({ callbackUrl: "/auth/login" });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLogoutError(message);
      return { ok: false, error: message };
    } finally {
      setIsLogoutPending(false);
    }
  }, []);

  return { logout, isLogoutPending, logoutError, clearLogoutError };
}
