import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  enforceSessionLimit,
  removeSession,
  touchSession,
} from "@/lib/session-guard";
import { authConfig } from "@/lib/auth.config";

const ARCHIVED_RECHECK_MS = 60_000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const baseToken = authConfig.callbacks?.jwt
        ? await authConfig.callbacks.jwt(params)
        : params.token;
      const token = baseToken as typeof baseToken & {
        sessionToken?: string;
        archivedCheckedAt?: number;
      };

      const now = Date.now();
      const shouldCheckArchivedStatus =
        typeof token.sub === "string" &&
        (params.user ||
          typeof token.archivedCheckedAt !== "number" ||
          now - token.archivedCheckedAt >= ARCHIVED_RECHECK_MS);

      if (shouldCheckArchivedStatus) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { isArchived: true },
        });

        if (!currentUser || currentUser.isArchived) {
          if (typeof token.sessionToken === "string" && token.sessionToken) {
            await removeSession(token.sessionToken);
          }
          return {
            ...token,
            exp: 0,
            sessionToken: undefined,
            archivedCheckedAt: now,
          };
        }

        token.archivedCheckedAt = now;
      }

      if (params.user) {
        const signedInUser = params.user as { sessionToken?: string };
        token.sessionToken = signedInUser.sessionToken;
      }

      if (typeof token.sessionToken === "string" && token.sessionToken) {
        await touchSession(token.sessionToken);
      }

      return token;
    },
    async session(params) {
      const baseSession = authConfig.callbacks?.session
        ? await authConfig.callbacks.session(params)
        : params.session;
      const session = baseSession as typeof baseSession & {
        sessionToken?: string;
      };

      if (typeof params.token.sessionToken === "string") {
        session.sessionToken = params.token.sessionToken;
      }

      return session;
    },
  },
  events: {
    async signOut(event) {
      if (!("token" in event)) {
        return;
      }

      const token = event.token;
      if (typeof token?.sessionToken === "string" && token.sessionToken) {
        await removeSession(token.sessionToken);
      }
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const emailInput = credentials?.email as string;
        const password = credentials?.password as string;

        if (!emailInput || !password) return null;

        const email = emailInput.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        if (user.isArchived) return null;

        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) return null;

        // Anti-account sharing: enforce session limits
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";

        const { allowed, sessionToken } = await enforceSessionLimit(
          user.id,
          ip,
          userAgent
        );
        if (!allowed) {
          throw new Error("MAX_SESSIONS_REACHED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionToken,
        };
      },
    }),
  ],
});
