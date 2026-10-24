import { AppShellRedirect } from './AppShellRedirect'

export const dynamic = 'force-static'
export const revalidate = false
export const dynamicParams = false

function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header bar */}
      <header className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-800/60" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-800" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5"
            >
              <div className="mb-3 h-3 w-24 rounded bg-zinc-800" />
              <div className="h-7 w-32 rounded bg-zinc-800" />
            </div>
          ))}
        </div>

        {/* Transaction list */}
        <div className="animate-pulse overflow-hidden rounded-xl border border-zinc-800/60">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex gap-4 border-b border-zinc-800/40 px-4 py-3 last:border-0"
            >
              <div className="h-4 w-20 rounded bg-zinc-800" />
              <div className="h-4 flex-1 rounded bg-zinc-800" />
              <div className="h-4 w-16 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default function AppShellPage() {
  return (
    <>
      <AppShellSkeleton />
      <AppShellRedirect />
    </>
  )
}
