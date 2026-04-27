"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteObjectByKey } from "@/lib/s3";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { unlink } from "fs/promises";
import path from "path";
import { BCRYPT_SALT_ROUNDS } from "@/lib/security";

const ATTACHMENT_SEPARATOR = "\n";

function splitAttachmentKeys(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(ATTACHMENT_SEPARATOR)
    .map((v) => v.trim())
    .filter(Boolean);
}

function isMissingAttachmentColumnError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022" &&
    String(error.message).includes("attachmentKey")
  );
}

async function ensureAttachmentColumn(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "sessions" ADD COLUMN "attachmentKey" TEXT'
  );
}

async function readSessionAttachmentKey(sessionId: string): Promise<string | null> {
  type Row = { attachmentKey: string | null };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT "attachmentKey" FROM "sessions" WHERE "id" = ${sessionId}
  `;
  return rows[0]?.attachmentKey ?? null;
}

async function writeSessionAttachmentKey(
  sessionId: string,
  attachmentValue: string
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "sessions" SET "attachmentKey" = ${attachmentValue}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${sessionId}
  `;
}

function requireTeacher(session: { user?: { id?: string } } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  if ((session.user as { role?: string }).role !== "TEACHER") {
    throw new Error("Only teachers can perform this action");
  }
  return session.user.id!;
}

async function ensureTeacherHasCourseAccess(teacherId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: teacherId,
        courseId,
      },
    },
    select: { id: true },
  });

  if (!enrollment) {
    throw new Error("You do not have access to this course");
  }
}

async function ensureTeacherCanManageStudent(teacherId: string, studentId: string) {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: "STUDENT",
      OR: [
        {
          enrollments: {
            some: {
              course: {
                enrollments: {
                  some: { userId: teacherId },
                },
              },
            },
          },
        },
        {
          enrollments: {
            none: {},
          },
        },
      ],
    },
    select: { id: true },
  });

  if (!student) {
    throw new Error("Student not found or not in your courses");
  }
}

async function deleteAttachmentFile(attachmentKey: string): Promise<void> {
  // Basic safety guard against path traversal for local files.
  if (!attachmentKey || attachmentKey.includes("..") || attachmentKey.startsWith("/")) {
    return;
  }

  if (attachmentKey.startsWith("uploads/")) {
    const absolutePath = path.join(process.cwd(), "public", attachmentKey);
    try {
      await unlink(absolutePath);
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
    return;
  }

  await deleteObjectByKey(attachmentKey);
}

/**
 * Teacher: Create a new week in a course.
 */
export async function createWeek(
  courseId: string,
  title: string,
  releaseAt?: string
) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  if (!title.trim()) throw new Error("Title is required");
  await ensureTeacherHasCourseAccess(teacherId, courseId);

  // Get the next week number
  const lastWeek = await prisma.week.findFirst({
    where: { courseId },
    orderBy: { number: "desc" },
  });
  const nextNumber = (lastWeek?.number ?? 0) + 1;

  const week = await prisma.week.create({
    data: {
      courseId,
      number: nextNumber,
      title: title.trim(),
      releaseAt: releaseAt ? new Date(releaseAt) : new Date(),
    },
  });

  revalidatePath(`/dashboard/course/${courseId}`);
  return week;
}

/**
 * Teacher: Update week metadata.
 */
export async function updateWeek(
  weekId: string,
  title: string,
  releaseAt?: string
) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  if (!title.trim()) throw new Error("Week title is required");

  const week = await prisma.week.findFirst({
    where: {
      id: weekId,
      course: {
        enrollments: {
          some: { userId: teacherId },
        },
      },
    },
    select: { id: true, courseId: true },
  });
  if (!week) throw new Error("Week not found");

  const updateResult = await prisma.week.updateMany({
    where: {
      id: weekId,
      course: {
        enrollments: {
          some: { userId: teacherId },
        },
      },
    },
    data: {
      title: title.trim(),
      ...(releaseAt ? { releaseAt: new Date(releaseAt) } : {}),
    },
  });

  if (updateResult.count === 0) {
    throw new Error("Week not found");
  }

  const updatedWeek = await prisma.week.findUnique({
    where: { id: weekId },
    select: { id: true, courseId: true, title: true, releaseAt: true },
  });
  if (!updatedWeek) {
    throw new Error("Week not found");
  }

  revalidatePath(`/dashboard/course/${week.courseId}`);
  return updatedWeek;
}

/**
 * Teacher: Delete a week and all dependent content.
 */
export async function deleteWeek(weekId: string) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  const week = await prisma.week.findFirst({
    where: {
      id: weekId,
      course: {
        enrollments: {
          some: { userId: teacherId },
        },
      },
    },
    select: { id: true, courseId: true },
  });
  if (!week) throw new Error("Week not found");

  await prisma.week.delete({ where: { id: weekId } });
  revalidatePath(`/dashboard/course/${week.courseId}`);
}

/**
 * Teacher: Create a new session (lesson) in a week.
 */
export async function createSession(
  weekId: string,
  title: string,
  description?: string,
  videoKey?: string,
  attachmentKey?: string
) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  if (!title.trim()) throw new Error("Title is required");

  // Get the week to find courseId and next order
  const week = await prisma.week.findFirst({
    where: {
      id: weekId,
      course: {
        enrollments: {
          some: { userId: teacherId },
        },
      },
    },
    include: { sessions: { orderBy: { order: "desc" }, take: 1 } },
  });
  if (!week) throw new Error("Week not found");

  const nextOrder = (week.sessions[0]?.order ?? 0) + 1;

  const newSession = await prisma.session.create({
    data: {
      weekId,
      title: title.trim(),
      description: description?.trim() || null,
      order: nextOrder,
      videoKey: videoKey || null,
      releaseAt: week.releaseAt,
    },
  });

  if (attachmentKey) {
    try {
      await writeSessionAttachmentKey(newSession.id, attachmentKey);
    } catch (error) {
      if (!isMissingAttachmentColumnError(error)) throw error;
      await ensureAttachmentColumn();
      await writeSessionAttachmentKey(newSession.id, attachmentKey);
    }
  }

  revalidatePath(`/dashboard/course/${week.courseId}`);
  return newSession;
}

/**
 * Teacher: Update session title/description.
 */
export async function updateSession(
  sessionId: string,
  title: string,
  description?: string
) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  if (!title.trim()) throw new Error("Session title is required");

  const sess = await prisma.session.findFirst({
    where: {
      id: sessionId,
      week: {
        course: {
          enrollments: {
            some: { userId: teacherId },
          },
        },
      },
    },
    include: { week: true },
  });
  if (!sess) throw new Error("Session not found");

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      title: title.trim(),
      ...(description !== undefined
        ? { description: description.trim() || null }
        : {}),
    },
  });

  revalidatePath(`/dashboard/course/${sess.week.courseId}`);
}

/**
 * Teacher: Delete a session and its dependent content.
 */
export async function deleteSession(sessionId: string) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  const sess = await prisma.session.findFirst({
    where: {
      id: sessionId,
      week: {
        course: {
          enrollments: {
            some: { userId: teacherId },
          },
        },
      },
    },
    include: { week: true },
  });
  if (!sess) throw new Error("Session not found");

  await prisma.session.delete({ where: { id: sessionId } });
  revalidatePath(`/dashboard/course/${sess.week.courseId}`);
}

/**
 * Teacher: Add a checklist item to a session.
 */
export async function createChecklistItem(
  sessionId: string,
  title: string,
  description?: string
) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  if (!title.trim()) throw new Error("Title is required");

  const sess = await prisma.session.findFirst({
    where: {
      id: sessionId,
      week: {
        course: {
          enrollments: {
            some: { userId: teacherId },
          },
        },
      },
    },
    include: {
      checklistItems: { orderBy: { order: "desc" }, take: 1 },
      week: true,
    },
  });
  if (!sess) throw new Error("Session not found");

  const nextOrder = (sess.checklistItems[0]?.order ?? 0) + 1;

  const item = await prisma.checklistItem.create({
    data: {
      sessionId,
      title: title.trim(),
      description: description?.trim() || null,
      order: nextOrder,
    },
  });

  revalidatePath(`/dashboard/course/${sess.week.courseId}`);
  return item;
}

/**
 * Teacher: Update a session's video key (after uploading a lesson video).
 */
export async function updateSessionVideo(
  sessionId: string,
  videoKey: string
) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  const sess = await prisma.session.findFirst({
    where: {
      id: sessionId,
      week: {
        course: {
          enrollments: {
            some: { userId: teacherId },
          },
        },
      },
    },
    include: { week: true },
  });
  if (!sess) throw new Error("Session not found");

  await prisma.session.update({
    where: { id: sessionId },
    data: { videoKey },
  });

  revalidatePath(`/dashboard/course/${sess.week.courseId}`);
}

/**
 * Teacher: Update a session's supplemental material (PDF/image).
 */
export async function updateSessionAttachment(
  sessionId: string,
  attachmentKey: string
) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  const sess = await prisma.session.findFirst({
    where: {
      id: sessionId,
      week: {
        course: {
          enrollments: {
            some: { userId: teacherId },
          },
        },
      },
    },
    include: { week: true },
  });
  if (!sess) throw new Error("Session not found");

  let existingAttachmentValue: string | null = null;
  try {
    existingAttachmentValue = await readSessionAttachmentKey(sessionId);
  } catch (error) {
    if (!isMissingAttachmentColumnError(error)) throw error;
    await ensureAttachmentColumn();
    existingAttachmentValue = null;
  }

  const mergedAttachmentKeys = Array.from(
    new Set([...splitAttachmentKeys(existingAttachmentValue), attachmentKey])
  );
  const attachmentValue = mergedAttachmentKeys.join(ATTACHMENT_SEPARATOR);

  try {
    await writeSessionAttachmentKey(sessionId, attachmentValue);
  } catch (error) {
    if (!isMissingAttachmentColumnError(error)) throw error;
    await ensureAttachmentColumn();
    await writeSessionAttachmentKey(sessionId, attachmentValue);
  }

  revalidatePath(`/dashboard/course/${sess.week.courseId}`);
}

/**
 * Teacher: Remove one attachment key from a session.
 */
export async function removeSessionAttachment(
  sessionId: string,
  attachmentKey: string
) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  const sess = await prisma.session.findFirst({
    where: {
      id: sessionId,
      week: {
        course: {
          enrollments: {
            some: { userId: teacherId },
          },
        },
      },
    },
    include: { week: true },
  });
  if (!sess) throw new Error("Session not found");

  let existingAttachmentValue: string | null = null;
  try {
    existingAttachmentValue = await readSessionAttachmentKey(sessionId);
  } catch (error) {
    if (!isMissingAttachmentColumnError(error)) throw error;
    await ensureAttachmentColumn();
    existingAttachmentValue = null;
  }

  const existingKeys = splitAttachmentKeys(existingAttachmentValue);
  if (!existingKeys.includes(attachmentKey)) {
    throw new Error("Attachment not found for this session");
  }

  await deleteAttachmentFile(attachmentKey);

  const updatedKeys = existingKeys.filter((k) => k !== attachmentKey);
  const nextValue = updatedKeys.length > 0 ? updatedKeys.join(ATTACHMENT_SEPARATOR) : "";

  try {
    await writeSessionAttachmentKey(sessionId, nextValue);
  } catch (error) {
    if (!isMissingAttachmentColumnError(error)) throw error;
    await ensureAttachmentColumn();
    await writeSessionAttachmentKey(sessionId, nextValue);
  }

  revalidatePath(`/dashboard/course/${sess.week.courseId}`);
}

// ─── Course CRUD ─────────────────────────────────────────

export async function createCourse(title: string, description?: string) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  if (!title.trim()) throw new Error("Title is required");

  const course = await prisma.$transaction(async (tx) => {
    const createdCourse = await tx.course.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
      },
    });

    await tx.enrollment.create({
      data: {
        userId: teacherId,
        courseId: createdCourse.id,
      },
    });

    return createdCourse;
  });

  revalidatePath("/dashboard/courses");
  return course;
}

export async function updateCourse(
  courseId: string,
  title: string,
  description?: string
) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  if (!title.trim()) throw new Error("Title is required");
  await ensureTeacherHasCourseAccess(teacherId, courseId);

  const course = await prisma.course.update({
    where: { id: courseId },
    data: {
      title: title.trim(),
      description: description?.trim() || null,
    },
  });

  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${courseId}`);
  return course;
}

export async function deleteCourse(courseId: string) {
  const session = await auth();
  const teacherId = requireTeacher(session);
  await ensureTeacherHasCourseAccess(teacherId, courseId);

  const enrollmentCount = await prisma.enrollment.count({
    where: {
      courseId,
      NOT: { userId: teacherId },
    },
  });

  if (enrollmentCount > 0) {
    throw new Error(
      "Cannot delete a course that has assigned students or teachers. Remove all members first."
    );
  }

  await prisma.course.delete({ where: { id: courseId } });

  revalidatePath("/dashboard/courses");
}

// ─── Enrollment Management ───────────────────────────────

export async function enrollStudent(courseId: string, studentId: string) {
  const session = await auth();
  const teacherId = requireTeacher(session);
  await ensureTeacherHasCourseAccess(teacherId, courseId);

  const student = await prisma.user.findUnique({
    where: { id: studentId, role: "STUDENT" },
  });
  if (!student) throw new Error("Student not found");

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
  });
  if (existing) throw new Error("Student is already enrolled in this course");

  await prisma.enrollment.create({
    data: { userId: studentId, courseId },
  });

  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function unenrollStudent(courseId: string, studentId: string) {
  const session = await auth();
  const teacherId = requireTeacher(session);
  await ensureTeacherHasCourseAccess(teacherId, courseId);

  await prisma.enrollment.deleteMany({
    where: { userId: studentId, courseId },
  });

  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function getStudents() {
  const session = await auth();
  const teacherId = requireTeacher(session);

  return prisma.user.findMany({
    where: {
      role: "STUDENT",
      OR: [
        {
          enrollments: {
            some: {
              course: {
                enrollments: {
                  some: { userId: teacherId },
                },
              },
            },
          },
        },
        {
          enrollments: {
            none: {},
          },
        },
      ],
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

// ─── Teacher Assignment ──────────────────────────────────

export async function assignTeacher(courseId: string, teacherId: string) {
  const session = await auth();
  const currentTeacherId = requireTeacher(session);
  await ensureTeacherHasCourseAccess(currentTeacherId, courseId);

  const teacher = await prisma.user.findUnique({
    where: { id: teacherId, role: "TEACHER" },
  });
  if (!teacher) throw new Error("Teacher not found");

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: teacherId, courseId } },
  });
  if (existing) throw new Error("Teacher is already assigned to this course");

  await prisma.enrollment.create({
    data: { userId: teacherId, courseId },
  });

  revalidatePath("/dashboard/courses");
}

export async function unassignTeacher(courseId: string, teacherId: string) {
  const session = await auth();
  const currentTeacherId = requireTeacher(session);
  await ensureTeacherHasCourseAccess(currentTeacherId, courseId);

  await prisma.enrollment.deleteMany({
    where: { userId: teacherId, courseId },
  });

  revalidatePath("/dashboard/courses");
}

// ─── Student Management ──────────────────────────────────

export async function addStudent(
  name: string,
  email: string,
  password: string
) {
  const session = await auth();
  requireTeacher(session);

  if (!name.trim()) throw new Error("Name is required");
  if (!email.trim()) throw new Error("Email is required");
  if (!password || password.length < 6)
    throw new Error("Password must be at least 6 characters");

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) throw new Error("A user with this email already exists");

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const student = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      hashedPassword,
      role: "STUDENT",
    },
  });

  revalidatePath("/dashboard/students");
  return { id: student.id };
}

export async function editStudent(
  studentId: string,
  name: string,
  email: string
) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  if (!name.trim()) throw new Error("Name is required");
  if (!email.trim()) throw new Error("Email is required");

  await ensureTeacherCanManageStudent(teacherId, studentId);
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT")
    throw new Error("Student not found");

  // Check email uniqueness if changed
  if (email.trim().toLowerCase() !== student.email) {
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) throw new Error("A user with this email already exists");
  }

  await prisma.user.update({
    where: { id: studentId },
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
    },
  });

  revalidatePath("/dashboard/students");
}

export async function resetStudentPassword(
  studentId: string,
  newPassword: string
) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  if (!newPassword || newPassword.length < 6)
    throw new Error("Password must be at least 6 characters");

  await ensureTeacherCanManageStudent(teacherId, studentId);
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT")
    throw new Error("Student not found");

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { id: studentId },
    data: { hashedPassword },
  });

  revalidatePath("/dashboard/students");
}

export async function archiveStudent(studentId: string) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  await ensureTeacherCanManageStudent(teacherId, studentId);
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT")
    throw new Error("Student not found");

  await prisma.user.update({
    where: { id: studentId },
    data: { isArchived: true },
  });

  revalidatePath("/dashboard/students");
}

export async function unarchiveStudent(studentId: string) {
  const session = await auth();
  const teacherId = requireTeacher(session);

  await ensureTeacherCanManageStudent(teacherId, studentId);
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT")
    throw new Error("Student not found");

  await prisma.user.update({
    where: { id: studentId },
    data: { isArchived: false },
  });

  revalidatePath("/dashboard/students");
}
