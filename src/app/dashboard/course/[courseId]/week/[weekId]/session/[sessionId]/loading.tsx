export default function SessionLoading() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="fixed left-0 top-0 h-screen w-64 border-r border-zinc-800 bg-zinc-950 p-4 animate-pulse">
        <div className="h-4 w-28 rounded bg-zinc-800" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-full rounded bg-zinc-800" />
          ))}
        </div>
      </div>
      {/* Main content skeleton */}
      <main className="ml-64 flex-1 p-8 animate-pulse">
        <div className="h-3 w-24 rounded bg-zinc-800" />
        <div className="mt-3 h-7 w-56 rounded bg-zinc-800" />
        <div className="mt-6 aspect-video w-full rounded-xl bg-zinc-900" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-20 rounded bg-zinc-800" />
          <div className="h-10 w-full rounded bg-zinc-800" />
          <div className="h-10 w-full rounded bg-zinc-800" />
        </div>
      </main>
    </div>
  );
}
