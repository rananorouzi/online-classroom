import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import CourseManager from "./CourseManager";

export default async function CoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const isTeacher = (session.user as { role?: string }).role === "TEACHER";
  if (!isTeacher) redirect("/dashboard");

  const courses = await prisma.course.findMany({
    include: {
      enrollments: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      _count: { select: { weeks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
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
        <h1 className="mt-3 text-2xl font-bold text-primary">
          Course Management
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create, edit, and manage courses and student enrollments.
        </p>
      </div>

      <CourseManager courses={courses} students={students} teachers={teachers} />
    </main>
  );
}
