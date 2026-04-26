import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentCoursesPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const isTeacher = (session.user as { role?: string }).role === "TEACHER";
  if (!isTeacher) redirect("/dashboard");

  const { studentId } = await params;
  const teacherId = session.user.id;

  const student = await prisma.user.findUnique({
    where: { id: studentId, role: "STUDENT" },
    include: {
      enrollments: {
        where: {
          course: {
            enrollments: {
              some: { userId: teacherId },
            },
          },
        },
        include: {
          course: {
            include: {
              weeks: {
                orderBy: { number: "asc" },
                take: 1,
                where: { releaseAt: { lte: new Date() } },
              },
            },
          },
        },
      },
    },
  });

  if (!student || student.enrollments.length === 0) notFound();

  return (
    <main className="px-6 py-12">
      <div className="mb-8">
        <Link
          href="/dashboard/students"
          className="text-xs text-gold/70 hover:text-gold transition"
        >
          ← Back to Students
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold font-semibold text-sm">
            {(student.name || student.email)[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {student.name || "Unnamed Student"}
            </h1>
            <p className="text-xs text-zinc-500">{student.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {student.enrollments.map((enrollment: { course: { id: string; title: string; description: string | null; weeks: { title: string }[] } }) => (
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
    </main>
  );
}
