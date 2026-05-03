import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCourseWeeks } from "@/app/actions/sessions";
import Link from "next/link";
import SidebarTimeline from "@/components/layout/SidebarTimeline";
import { prisma } from "@/lib/db";
import Breadcrumb from "@/components/layout/Breadcrumb";

interface Props {
  params: Promise<{ courseId: string; weekId: string }>;
}

export default async function WeekPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { courseId, weekId } = await params;
  const [weeks, course] = await Promise.all([
    getCourseWeeks(courseId),
    prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
  ]);
  const week = weeks.find((w: (typeof weeks)[number]) => w.id === weekId);

  if (!week) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Week not found</p>
      </main>
    );
  }

  if (week.isLocked) {
    return (
      <div className="flex min-h-screen bg-background">
        <SidebarTimeline weeks={weeks} currentWeekId={weekId} courseId={courseId} />
        <main className="ml-64 flex-1 p-8">
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-zinc-500">
            <span className="text-4xl">🔒</span>
            <p className="text-sm">This week is not yet available</p>
            <p className="text-xs text-zinc-600">
              Available {new Date(week.releaseAt).toLocaleDateString("en-US")}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarTimeline weeks={weeks} currentWeekId={weekId} courseId={courseId} />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: course?.title ?? "Course", href: `/dashboard/course/${courseId}` },
              { label: week.title },
            ]}
          />
          <h1 className="mt-3 text-2xl font-bold text-primary">
            Session {new Date(week.releaseAt).toLocaleDateString("en-GB")}: {week.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {week.sessions.length} session{week.sessions.length !== 1 && "s"}
          </p>
        </div>

        <div className="space-y-3">
          {week.sessions.map((s: (typeof week.sessions)[number]) => (
            <Link
              key={s.id}
              href={`/dashboard/course/${courseId}/week/${weekId}/session/${s.id}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-gold/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-primary">
                    {s.title}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Session {s.order}
                    {(s.videoKey || s.attachmentKey) && (
                      <span className="ml-2 text-zinc-400">
                        {s.videoKey && "🎬 Video"}
                        {s.videoKey && s.attachmentKey && " · "}
                        {s.attachmentKey && "📎 Attachment"}
                      </span>
                    )}
                    {s.isLocked && (
                      <span className="ml-2 text-zinc-600">
                        🔒 Available{" "}
                        {new Date(s.releaseAt).toLocaleDateString("en-US")}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-gold">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
