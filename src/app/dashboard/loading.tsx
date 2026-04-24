export default function DashboardLoading() {
  return (
    <main className="px-6 py-12 animate-pulse">
      <div className="mb-8">
        <div className="h-3 w-20 rounded bg-zinc-800" />
        <div className="mt-3 h-8 w-64 rounded bg-zinc-800" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-6"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-800" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-zinc-800" />
                <div className="h-3 w-24 rounded bg-zinc-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
