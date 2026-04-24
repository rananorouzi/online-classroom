import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCourseWeeks, getSession } from "@/app/actions/sessions";
import SessionPageClient from "@/components/pages/SessionPageClient";

interface Props {
  params: Promise<{ courseId: string; weekId: string; sessionId: string }>;
}

export default async function SessionPage({ params }: Props) {
  const userSession = await auth();
  if (!userSession?.user) redirect("/auth/login");

  const { courseId, sessionId } = await params;

  let weeks, session;
  try {
    [weeks, session] = await Promise.all([
      getCourseWeeks(courseId),
      getSession(sessionId),
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
    />
  );
}
