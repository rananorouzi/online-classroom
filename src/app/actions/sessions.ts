"use server";

import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type JsonValue = Prisma.JsonValue;

/**
 * Get course weeks with drip-content filtering.
 * Only returns weeks where releaseAt <= now.
 */
export async function getCourseWeeks(courseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const userRole = (session.user as { role?: string }).role;
  const isAdmin = userRole === "ADMIN";

  if (!isAdmin) {
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

  const weeks = await prisma.week.findMany({
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

  const userRole = (userSession.user as { role?: string }).role;
  const isTeacher = userRole === "TEACHER";
  const isAdmin = userRole === "ADMIN";

  const session = await prisma.session.findUnique({
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

  if (!session) throw new Error("Session not found");

  if (!isAdmin) {
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
