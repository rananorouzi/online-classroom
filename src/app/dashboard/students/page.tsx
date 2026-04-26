import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import StudentManager from "./StudentManager";

export default async function StudentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const isTeacher = (session.user as { role?: string }).role === "TEACHER";
  if (!isTeacher) redirect("/dashboard");

  const teacherId = session.user.id;

  const students = await prisma.user.findMany({
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
    select: {
      id: true,
      name: true,
      email: true,
      isArchived: true,
      createdAt: true,
    },
    orderBy: [{ isArchived: "asc" }, { name: "asc" }],
  });

  const sharedCourseCounts = await prisma.enrollment.groupBy({
    by: ["userId"],
    where: {
      userId: { in: students.map((student) => student.id) },
      course: {
        enrollments: {
          some: { userId: teacherId },
        },
      },
    },
    _count: { userId: true },
  });

  const sharedCourseCountByStudentId = new Map(
    sharedCourseCounts.map((entry) => [entry.userId, entry._count.userId])
  );

  const studentsWithCounts = students.map((student) => ({
    ...student,
    sharedCoursesCount: sharedCourseCountByStudentId.get(student.id) ?? 0,
  }));

  return (
    <main className="px-6 py-12">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-xs text-gold/70 hover:text-gold transition"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-primary">
          Student Management
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Add, edit, and archive students.
        </p>
      </div>

      <StudentManager students={studentsWithCounts} />
    </main>
  );
}
