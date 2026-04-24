export default function CourseLoading() {
  return (
    <main className="px-6 py-12 animate-pulse">
      <div className="mb-8">
        <div className="h-3 w-28 rounded bg-zinc-800" />
        <div className="mt-3 h-7 w-48 rounded bg-zinc-800" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="h-5 w-40 rounded bg-zinc-800" />
            <div className="mt-2 h-3 w-24 rounded bg-zinc-800" />
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full rounded bg-zinc-800" />
              <div className="h-4 w-full rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
