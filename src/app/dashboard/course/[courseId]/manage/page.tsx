import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCourseWeeks } from "@/app/actions/sessions";
import { prisma } from "@/lib/db";
import Link from "next/link";
import TeacherCourseControls from "@/components/ui/TeacherCourseControls";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function ManageCoursePage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const isTeacher = (session.user as { role?: string }).role === "TEACHER";
  if (!isTeacher) redirect("/dashboard");

  const { courseId } = await params;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      enrollments: {
        some: { userId: session.user.id },
      },
    },
    select: { id: true, title: true },
  });
  if (!course) redirect("/dashboard");

  const weeks = await getCourseWeeks(courseId);

  return (
    <main className="px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/course/${courseId}`}
          className="text-xs text-gold/70 hover:text-gold transition"
        >
          ← Back to Course
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-primary">
          Manage: {course.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {weeks.length} week{weeks.length !== 1 && "s"} total
        </p>
      </div>

      <TeacherCourseControls courseId={courseId} weeks={weeks} />
    </main>
  );
}
