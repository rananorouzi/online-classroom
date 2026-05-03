import { prisma } from "@/lib/db";

export function isValidMediaKey(key: string): boolean {
  if (!key || key.includes("..") || key.startsWith("/")) {
    return false;
  }

  // Allow percent-encoded sequences and spaces for backwards compatibility
  // Still restrict to a safe set of characters: letters, numbers, underscore, dash, dot, slash, percent, and space
  return /^[a-zA-Z0-9 _%/\-.]+$/.test(key);
}

export async function canAccessMediaKey(
  userId: string,
  role: string | undefined,
  key: string
): Promise<boolean> {
  if (!isValidMediaKey(key)) {
    return false;
  }

  if (role === "TEACHER" || role === "ADMIN") {
    return true;
  }

  const now = new Date();

  const [submissionCount, feedbackCount, sessionCount] = await Promise.all([
    prisma.submission.count({
      where: {
        studentId: userId,
        fileKey: key,
      },
    }),
    prisma.feedback.count({
      where: {
        audioKey: key,
        submission: {
          studentId: userId,
        },
      },
    }),
    prisma.session.count({
      where: {
        releaseAt: { lte: now },
        week: {
          releaseAt: { lte: now },
          course: {
            enrollments: {
              some: {
                userId,
              },
            },
          },
        },
        OR: [
          { videoKey: key },
          { attachmentKey: { contains: key } },
        ],
      },
    }),
  ]);

  return submissionCount > 0 || feedbackCount > 0 || sessionCount > 0;
}
