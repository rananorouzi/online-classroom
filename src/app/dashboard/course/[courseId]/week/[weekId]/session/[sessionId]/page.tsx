import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCourseWeeks, getSession } from "@/app/actions/sessions";
import SessionPageClient from "@/components/pages/SessionPageClient";
import { prisma } from "@/lib/db";

interface Props {
  params: Promise<{ courseId: string; weekId: string; sessionId: string }>;
}

export default async function SessionPage({ params }: Props) {
  const userSession = await auth();
  if (!userSession?.user) redirect("/auth/login");

  const { courseId, sessionId } = await params;

  let weeks, session;
  let course: { title: string } | null = null;
  try {
    [weeks, session, course] = await Promise.all([
      getCourseWeeks(courseId),
      getSession(sessionId),
      prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
    ]);
  } catch {
    redirect(`/dashboard/course/${courseId}`);
  }

  return (
    <SessionPageClient
      weeks={weeks}
      session={JSON.parse(JSON.stringify(session))}
      courseId={courseId}
      currentUserId={userSession.user.id}
      userRole={(userSession.user as { role?: string }).role || "STUDENT"}
      courseTitle={course?.title ?? "Course"}
    />
  );
}
