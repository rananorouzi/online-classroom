"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

function isPrismaErrorWithAttachmentKey(
  error: unknown,
  code: string
): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    error.code === code &&
    error.message.includes("attachmentKey")
  );
}

function isPrismaValidationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string" &&
    error.name === "PrismaClientValidationError"
  );
}

function isMissingAttachmentColumnError(error: unknown): boolean {
  return isPrismaErrorWithAttachmentKey(error, "P2022");
}

/**
 * Get course weeks with drip-content filtering.
 * Only returns weeks where releaseAt <= now.
 */
export async function getCourseWeeks(courseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const userRole = (session.user as { role?: string }).role;
  const isTeacher = userRole === "TEACHER" || userRole === "ADMIN";

  if (!isTeacher) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
      select: { id: true },
    });

    if (!enrollment) {
      throw new Error("Unauthorized");
    }
  }

  const now = new Date();

  let weeks: Array<{
    id: string;
    number: number;
    title: string;
    releaseAt: Date;
    sessions: Array<{
      id: string;
      title: string;
      order: number;
      releaseAt: Date;
      videoKey: string | null;
      attachmentKey: string | null;
      _count: { checklistItems: number };
    }>;
  }>;

  try {
    weeks = await prisma.week.findMany({
      where: { courseId },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        title: true,
        releaseAt: true,
        sessions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            releaseAt: true,
            videoKey: true,
            attachmentKey: true,
            _count: { select: { checklistItems: true } },
          },
        },
      },
    });
  } catch (error) {
    // Handles stale generated Prisma client during local dev after schema changes.
    if (!isPrismaValidationError(error) && !isMissingAttachmentColumnError(error)) {
      throw error;
    }

    const legacyWeeks = await prisma.week.findMany({
      where: { courseId },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        title: true,
        releaseAt: true,
        sessions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            releaseAt: true,
            videoKey: true,
            _count: { select: { checklistItems: true } },
          },
        },
      },
    });

    weeks = legacyWeeks.map((week: typeof legacyWeeks[number]) => ({
      ...week,
      sessions: week.sessions.map((s: typeof week.sessions[number]) => ({
        ...s,
        attachmentKey: null,
      })),
    }));
  }

  return weeks.map((week: typeof weeks[number]) => ({
    ...week,
    isLocked: week.releaseAt > now,
    sessions: week.sessions.map((s: typeof week.sessions[number]) => ({
      ...s,
      isLocked: s.releaseAt > now,
      videoKey: s.releaseAt > now ? null : s.videoKey,
      attachmentKey: s.releaseAt > now ? null : s.attachmentKey,
    })),
  }));
}

/**
 * Get a single session with drip-content check.
 */
export async function getSession(sessionId: string) {
  const userSession = await auth();
  if (!userSession?.user) throw new Error("Unauthorized");

  const isTeacher = (userSession.user as { role?: string }).role === "TEACHER";

  let session:
    | {
        id: string;
        title: string;
        description: string | null;
        videoKey: string | null;
        attachmentKey: string | null;
        releaseAt: Date;
        week: { id: string; number: number; title: string; releaseAt: Date };
        checklistItems: Array<{
          id: string;
          title: string;
          description: string | null;
          order: number;
          submissions: Array<{
            id: string;
            status: "IDLE" | "PENDING" | "REVISION" | "COMPLETED";
            createdAt: Date;
            fileKey: string | null;
            fileName: string | null;
            fileType: string | null;
            student: { id: string; name: string | null; email: string } | null;
            feedbacks: Array<{
              id: string;
              comment: string | null;
              audioKey: string | null;
              waveformJson: JsonValue | null;
              createdAt: Date;
            }>;
          }>;
        }>;
      }
    | null;

  try {
    session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        title: true,
        description: true,
        videoKey: true,
        attachmentKey: true,
        releaseAt: true,
        week: { select: { id: true, number: true, title: true, releaseAt: true } },
        checklistItems: {
          orderBy: { order: "asc" },
          include: {
            submissions: {
              where: isTeacher ? {} : { studentId: userSession.user.id },
              include: {
                student: { select: { id: true, name: true, email: true } },
                feedbacks: {
                  orderBy: { createdAt: "desc" },
                  take: 5,
                  select: {
                    id: true,
                    comment: true,
                    audioKey: true,
                    waveformJson: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch (error) {
    if (!isMissingAttachmentColumnError(error)) throw error;

    const legacySession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        title: true,
        description: true,
        videoKey: true,
        releaseAt: true,
        week: { select: { id: true, number: true, title: true, releaseAt: true } },
        checklistItems: {
          orderBy: { order: "asc" },
          include: {
            submissions: {
              where: isTeacher ? {} : { studentId: userSession.user.id },
              include: {
                student: { select: { id: true, name: true, email: true } },
                feedbacks: {
                  orderBy: { createdAt: "desc" },
                  take: 5,
                  select: {
                    id: true,
                    comment: true,
                    audioKey: true,
                    waveformJson: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    session = legacySession
      ? { ...legacySession, attachmentKey: null }
      : null;
  }

  if (!session) throw new Error("Session not found");

  if (!isTeacher) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: userSession.user.id,
        course: {
          weeks: {
            some: {
              sessions: {
                some: { id: sessionId },
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (!enrollment) {
      throw new Error("Unauthorized");
    }
  }

  // Drip content enforcement
  if (session.releaseAt > new Date()) {
    throw new Error("This content is not yet available");
  }

  return session;
}
