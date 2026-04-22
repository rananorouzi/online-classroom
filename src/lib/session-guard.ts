import { prisma } from "./db";
import crypto from "crypto";

const MAX_CONCURRENT_SESSIONS = 2;

function hashDevice(ip: string, userAgent: string): string {
  return crypto
    .createHash("sha256")
    .update(`${ip}:${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Enforces concurrent session limits.
 * Returns the session token if allowed, or null if blocked.
 */
export async function enforceSessionLimit(
  userId: string,
  ip: string,
  userAgent: string
): Promise<{ allowed: boolean; sessionToken: string | null }> {
  const deviceHash = hashDevice(ip, userAgent);

  // Check if this device already has a session
  const existing = await prisma.activeSession.findUnique({
    where: { userId_deviceHash: { userId, deviceHash } },
  });

  if (existing) {
    // Update last active and allow
    await prisma.activeSession.update({
      where: { id: existing.id },
      data: { lastActive: new Date(), ipAddress: ip },
    });
    return { allowed: true, sessionToken: existing.sessionToken };
  }

  // Count active sessions (active within last 30 minutes)
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const activeSessions = await prisma.activeSession.findMany({
    where: { userId, lastActive: { gte: cutoff } },
    orderBy: { lastActive: "asc" },
  });

  if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
    return { allowed: false, sessionToken: null };
  }

  // Create new session
  const sessionToken = crypto.randomUUID();
  await prisma.activeSession.create({
    data: { userId, ipAddress: ip, userAgent, deviceHash, sessionToken },
  });

  return { allowed: true, sessionToken };
}

/**
 * Remove a session on logout.
 */
export async function removeSession(sessionToken: string): Promise<void> {
  await prisma.activeSession.deleteMany({ where: { sessionToken } });
}

/**
 * Clean up stale sessions (older than 30 minutes without activity).
 */
export async function cleanupStaleSessions(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  await prisma.activeSession.deleteMany({
    where: { lastActive: { lt: cutoff } },
  });
}
