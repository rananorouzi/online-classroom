"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Student: Create or update a submission (upload).
 * Transitions: IDLE -> PENDING, REVISION -> PENDING
 */
export async function submitWork(
  checklistItemId: string,
  fileKey: string,
  fileName: string,
  fileType: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const item = await prisma.checklistItem.findUnique({
    where: { id: checklistItemId },
    select: {
      id: true,
      session: {
        select: {
          releaseAt: true,
          week: {
            select: {
              releaseAt: true,
              courseId: true,
            },
          },
        },
      },
    },
  });

  if (!item) {
    throw new Error("Checklist item not found");
  }

  const userRole = (session.user as { role?: string }).role;
  const isTeacher = userRole === "TEACHER" || userRole === "ADMIN";

  if (!isTeacher) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: item.session.week.courseId,
        },
      },
      select: { id: true },
    });

    if (!enrollment) {
      throw new Error("Unauthorized");
    }

    const now = new Date();
    if (item.session.week.releaseAt > now || item.session.releaseAt > now) {
      throw new Error("This content is not yet available");
    }
  }

  const existingSubmission = await prisma.submission.findFirst({
    where: {
      checklistItemId,
      studentId: session.user.id,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const submission = existingSubmission
    ? await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          status: "PENDING",
          fileKey,
          fileName,
          fileType,
        },
      })
    : await prisma.submission.create({
        data: {
          checklistItemId,
          studentId: session.user.id,
          status: "PENDING",
          fileKey,
          fileName,
          fileType,
        },
      });

  revalidatePath("/dashboard");
  return submission;
}

/**
 * Student: Delete own submission.
 */
export async function deleteSubmission(submissionId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });
  if (!submission) throw new Error("Submission not found");
  if (submission.studentId !== session.user.id) {
    throw new Error("You can only delete your own submissions");
  }
  if (submission.status !== "PENDING") {
    throw new Error("Cannot delete a submission that has been reviewed");
  }

  await prisma.submission.delete({ where: { id: submissionId } });
  revalidatePath("/dashboard");
}

/**
 * Teacher: Approve a submission.
 * Transitions: PENDING -> COMPLETED
 */
export async function approveSubmission(submissionId: string) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "TEACHER") {
    throw new Error("Unauthorized");
  }

  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "COMPLETED" },
  });

  revalidatePath("/dashboard");
  return submission;
}

/**
 * Teacher: Request revision on a submission.
 * Transitions: PENDING -> REVISION
 */
export async function requestRevision(
  submissionId: string,
  comment: string,
  audioKey?: string,
  waveformJson?: object
) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "TEACHER") {
    throw new Error("Unauthorized");
  }

  const [submission] = await prisma.$transaction([
    prisma.submission.update({
      where: { id: submissionId },
      data: { status: "REVISION" },
    }),
    prisma.feedback.create({
      data: {
        submissionId,
        teacherId: session.user.id,
        comment,
        audioKey,
        waveformJson: waveformJson ?? undefined,
        approved: false,
      },
    }),
  ]);

  revalidatePath("/dashboard");
  return submission;
}

/**
 * Teacher: Approve with feedback.
 */
export async function approveWithFeedback(
  submissionId: string,
  comment: string,
  audioKey?: string,
  waveformJson?: object
) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "TEACHER") {
    throw new Error("Unauthorized");
  }

  const [submission] = await prisma.$transaction([
    prisma.submission.update({
      where: { id: submissionId },
      data: { status: "COMPLETED" },
    }),
    prisma.feedback.create({
      data: {
        submissionId,
        teacherId: session.user.id,
        comment,
        audioKey,
        waveformJson: waveformJson ?? undefined,
        approved: true,
      },
    }),
  ]);

  revalidatePath("/dashboard");
  return submission;
}
