import type { NextAuthConfig } from "next-auth";

// Shared auth config — Edge-compatible (no Node.js modules)
export const authConfig: NextAuthConfig = {
  providers: [
    // Credentials provider for username/password login
    {
      id: "credentials",
      name: "Credentials",
      type: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
      // Real implementation: check user credentials using Prisma and bcrypt
      const { prisma } = await import("@/lib/db");
      const bcrypt = (await import("bcryptjs")).default;
      const email = typeof credentials?.email === "string" ? credentials.email : undefined;
      const password = typeof credentials?.password === "string" ? credentials.password : undefined;
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.hashedPassword) return null;
      const isValid = await bcrypt.compare(password, user.hashedPassword);
      if (!isValid) return null;
      // Return user object (id, email, role, etc.)
      return { id: user.id, email: user.email, role: user.role };
      },
    },
  ],
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
