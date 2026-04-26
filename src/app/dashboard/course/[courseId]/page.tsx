import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCourseWeeks } from "@/app/actions/sessions";
import Link from "next/link";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { courseId } = await params;
  let weeks: Awaited<ReturnType<typeof getCourseWeeks>>;
  try {
    weeks = await getCourseWeeks(courseId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Session not found")
    ) {
      redirect("/dashboard");
    }
    throw error;
  }
  const isTeacher = (session.user as { role?: string }).role === "TEACHER";

  return (
    <main className="px-6 py-12">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-xs text-gold/70 hover:text-gold transition"
        >
          ← Back to Dashboard
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-primary">Course sessions</h1>

          {isTeacher && (
            <Link
              href={`/dashboard/course/${courseId}/manage`}
              className="inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2 text-sm font-medium text-gold transition hover:bg-gold/10 hover:border-gold/50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Course
          </Link>
        )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {weeks.map((week: Awaited<ReturnType<typeof getCourseWeeks>>[number]) => (
          <div
            key={week.id}
            className={`rounded-xl border p-5 transition flex flex-col ${
              week.isLocked
                ? "border-zinc-800 bg-zinc-950 opacity-50"
                : "border-zinc-800 bg-zinc-950 hover:border-gold/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-primary">
                  Session {new Date(week.releaseAt).toLocaleDateString("en-GB")}: {week.title}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {week.sessions.length} session{week.sessions.length !== 1 && "s"}
                  {week.isLocked && (
                    <span className="ml-2 text-zinc-600">
                      🔒 Available {new Date(week.releaseAt).toLocaleDateString("en-US")}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {!week.isLocked && (
              <div className="mt-3 space-y-1">
                {week.sessions.map((s: typeof week.sessions[number]) => (
                  <Link
                    key={s.id}
                    href={`/dashboard/course/${courseId}/week/${week.id}/session/${s.id}`}
                    className={`block rounded-lg px-3 py-2 text-sm transition ${
                      s.isLocked
                        ? "text-zinc-600 cursor-not-allowed"
                        : "text-zinc-300 hover:bg-zinc-800/50 hover:text-gold"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{s.order}. {s.title}</span>
                      <span className="shrink-0 text-[10px] text-zinc-500">
                        {s.videoKey && "🎬"}
                        {s.attachmentKey && "📎"}
                      </span>
                    </div>
                    {s.isLocked && " 🔒"}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
