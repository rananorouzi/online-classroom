import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
      enrollments: {
        select: {
          course: {
            select: {
              enrollments: {
                where: {
                  user: {
                    role: "STUDENT",
                    isArchived: false,
                  },
                },
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ isArchived: "asc" }, { name: "asc" }],
  });

  const teachers = teachersWithCourses.map((teacher) => {
    const studentIds = new Set<string>();

    for (const enrollment of teacher.enrollments) {
      for (const studentEnrollment of enrollment.course.enrollments) {
        studentIds.add(studentEnrollment.userId);
      }
    }

    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      isArchived: teacher.isArchived,
      createdAt: teacher.createdAt,
      coursesCount: teacher.enrollments.length,
      studentsCount: studentIds.size,
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