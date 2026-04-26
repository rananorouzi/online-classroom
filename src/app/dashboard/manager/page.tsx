import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import TeacherManager from "./TeacherManager";

export default async function ManagerPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const teachersWithCourses = await prisma.user.findMany({
    where: { role: "TEACHER" },
    select: {
      id: true,
      name: true,
      email: true,
      isArchived: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
    orderBy: [{ isArchived: "asc" }, { name: "asc" }],
  });

  const teacherIds = teachersWithCourses.map((teacher) => teacher.id);
  const studentCounts = teacherIds.length
    ? await prisma.$queryRaw<Array<{ teacherId: string; studentsCount: number }>>(Prisma.sql`
        SELECT
          teacher_enrollments.userId AS teacherId,
          COUNT(DISTINCT student_enrollments.userId) AS studentsCount
        FROM enrollments AS teacher_enrollments
        INNER JOIN enrollments AS student_enrollments
          ON teacher_enrollments.courseId = student_enrollments.courseId
        INNER JOIN users AS students
          ON students.id = student_enrollments.userId
        WHERE teacher_enrollments.userId IN (${Prisma.join(teacherIds)})
          AND students.role = 'STUDENT'
          AND students.isArchived = false
        GROUP BY teacher_enrollments.userId
      `)
    : [];
  const studentCountByTeacherId = new Map(
    studentCounts.map((row) => [row.teacherId, Number(row.studentsCount)])
  );

  const teachers = teachersWithCourses.map((teacher) => {
    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      isArchived: teacher.isArchived,
      createdAt: teacher.createdAt,
      coursesCount: teacher._count.enrollments,
      studentsCount: studentCountByTeacherId.get(teacher.id) ?? 0,
    };
  });

  return (
    <main className="px-6 py-12">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-xs text-gold/70 hover:text-gold transition"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-primary">Teacher Management</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Add, edit, archive, and remove teachers. Teachers can be removed only when they have no active students.
        </p>
      </div>

      <TeacherManager teachers={teachers} />
    </main>
  );
}