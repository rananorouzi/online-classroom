import type { NextAuthConfig } from "next-auth";

// Shared auth config — Edge-compatible (no Node.js modules)
export const authConfig: NextAuthConfig = {
  providers: [], // Providers added in full auth.ts
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const publicRoutes = [
        "/auth/login",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/auth/error",
      ];
      if (publicRoutes.some((route) => pathname.startsWith(route)))
        return true;
      if (pathname.startsWith("/api/auth")) return true;
      if (
        pathname.startsWith("/_next") ||
        pathname === "/sw.js" ||
        pathname === "/manifest.json" ||
        pathname.startsWith("/icons")
      )
        return true;

      return isLoggedIn; // Redirect to signIn if not logged in
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
};
