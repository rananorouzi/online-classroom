"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireManager() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    throw new Error("Only managers can perform this action");
  }

  return session.user.id;
}

export async function addTeacher(name: string, email: string, password: string) {
  await requireManager();

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedName) throw new Error("Name is required");
  if (!normalizedEmail) throw new Error("Email is required");
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new Error("A user with this email already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  const teacher = await prisma.user.create({
    data: {
      name: normalizedName,
      email: normalizedEmail,
      hashedPassword,
      role: "TEACHER",
      isArchived: false,
    },
    select: { id: true },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/courses");

  return teacher;
}

export async function editTeacher(teacherId: string, name: string, email: string) {
  await requireManager();

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedName) throw new Error("Name is required");
  if (!normalizedEmail) throw new Error("Email is required");

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.role !== "TEACHER") throw new Error("Teacher not found");

  if (normalizedEmail !== teacher.email) {
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new Error("A user with this email already exists");
  }

  await prisma.user.update({
    where: { id: teacherId },
    data: {
      name: normalizedName,
      email: normalizedEmail,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/courses");
}

export async function archiveTeacher(teacherId: string) {
  const managerId = await requireManager();
  if (managerId === teacherId) throw new Error("You cannot archive your own account");

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.role !== "TEACHER") throw new Error("Teacher not found");

  await prisma.user.update({
    where: { id: teacherId },
    data: { isArchived: true },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/courses");
}

export async function unarchiveTeacher(teacherId: string) {
  await requireManager();

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.role !== "TEACHER") throw new Error("Teacher not found");

  await prisma.user.update({
    where: { id: teacherId },
    data: { isArchived: false },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/courses");
}

export async function removeTeacher(teacherId: string) {
  const managerId = await requireManager();
  if (managerId === teacherId) throw new Error("You cannot remove your own account");

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.role !== "TEACHER") throw new Error("Teacher not found");

  const assignedStudentCount = await prisma.enrollment.count({
    where: {
      userId: teacherId,
      course: {
        enrollments: {
          some: {
            user: {
              role: "STUDENT",
              isArchived: false,
            },
          },
        },
      },
    },
  });

  if (assignedStudentCount > 0) {
    throw new Error("Teacher cannot be removed while assigned to courses with students");
  }

  await prisma.user.delete({ where: { id: teacherId } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/courses");
}