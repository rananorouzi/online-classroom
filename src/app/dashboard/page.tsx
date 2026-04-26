import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const userRole = (session.user as { role?: string }).role;

  if (userRole === "ADMIN") {
    const [activeTeachers, archivedTeachers] = await Promise.all([
      prisma.user.count({ where: { role: "TEACHER", isArchived: false } }),
      prisma.user.count({ where: { role: "TEACHER", isArchived: true } }),
    ]);

    return (
      <main className="px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-gold">
            Dashboard
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-primary">
              Welcome back, {session.user.name || "Manager"}
            </h1>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/manager"
                className="inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2 text-sm font-medium text-gold transition hover:bg-gold/10 hover:border-gold/50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Teachers
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Active Teachers</p>
            <p className="mt-2 text-3xl font-bold text-primary">{activeTeachers}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Archived Teachers</p>
            <p className="mt-2 text-3xl font-bold text-primary">{archivedTeachers}</p>
          </div>
        </div>
      </main>
    );
  }

  if (userRole === "TEACHER") {
    const teacherId = session.user.id;
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        isArchived: false,
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
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: { name: "asc" },
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
          <p className="text-xs font-medium uppercase tracking-wider text-gold">
            Dashboard
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-primary">
              Welcome back, {session.user.name || "Teacher"}
            </h1>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/courses"
                className="inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2 text-sm font-medium text-gold transition hover:bg-gold/10 hover:border-gold/50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Manage Courses
              </Link>
              <Link
                href="/dashboard/students"
                className="inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2 text-sm font-medium text-gold transition hover:bg-gold/10 hover:border-gold/50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Students
              </Link>
            </div>
          </div>
        </div>

        {studentsWithCounts.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-12 text-center">
            <p className="text-zinc-400">No students registered yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {studentsWithCounts.map((student: (typeof studentsWithCounts)[number]) => (
              <Link
                key={student.id}
                href={`/dashboard/student/${student.id}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-gold/30 hover:bg-zinc-950/80"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold font-semibold text-sm">
                    {(student.name || student.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-primary group-hover:text-gold transition truncate">
                      {student.name || "Unnamed Student"}
                    </h2>
                    <p className="text-xs text-zinc-500 truncate">{student.email}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-zinc-600">
                  {student.sharedCoursesCount} shared course{student.sharedCoursesCount > 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    );
  }

  // Student view — show enrolled courses
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          weeks: {
            orderBy: { number: "asc" },
            take: 1,
            where: { releaseAt: { lte: new Date() } },
            select: { title: true },
          },
        },
      },
    },
  });

  return (
    <main className="px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-gold">
          Dashboard
        </p>
        <h1 className="mt-1 text-3xl font-bold text-primary">
          Welcome back, {session.user.name || "Student"}
        </h1>
      </div>

      {enrollments.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-12 text-center">
          <p className="text-zinc-400">
            You&apos;re not enrolled in any courses yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((enrollment: (typeof enrollments)[number]) => (
            <Link
              key={enrollment.course.id}
              href={`/dashboard/course/${enrollment.course.id}`}
              className="group rounded-xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-gold/30 hover:bg-zinc-950/80"
            >
              <h2 className="text-lg font-semibold text-primary group-hover:text-gold transition">
                {enrollment.course.title}
              </h2>
              {enrollment.course.description && (
                <p className="mt-2 text-sm text-zinc-500 line-clamp-2">
                  {enrollment.course.description}
                </p>
              )}
              <p className="mt-4 text-xs text-zinc-600">
                {enrollment.course.weeks.length > 0
                  ? `Latest: ${enrollment.course.weeks[0].title}`
                  : "Coming soon"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
