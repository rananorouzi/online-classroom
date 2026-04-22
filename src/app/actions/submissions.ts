"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SubmissionStatus } from "@prisma/client";
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

  const submission = await prisma.submission.create({
    data: {
      checklistItemId,
      studentId: session.user.id,
      status: SubmissionStatus.PENDING,
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
    data: { status: SubmissionStatus.COMPLETED },
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
      data: { status: SubmissionStatus.REVISION },
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
      data: { status: SubmissionStatus.COMPLETED },
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
