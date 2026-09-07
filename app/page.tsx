import { Suspense } from 'react'
import { getTransactions, getDebts } from '@/lib/supabase/dal'
import { verifySession } from '@/lib/supabase/verify-session'
import { DashboardShell } from '@/components/DashboardShell'

async function Dashboard() {
  await verifySession()
  const [transactions, debts] = await Promise.all([
    getTransactions(),
    getDebts(),
  ])

  return <DashboardShell transactions={transactions} debts={debts} />
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header skeleton */}
      <header className="border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="space-y-1.5">
            <div className="h-5 w-40 rounded bg-zinc-800 animate-pulse" />
            <div className="h-3 w-56 rounded bg-zinc-800/60 animate-pulse" />
          </div>
          <div className="h-9 w-36 rounded-lg bg-zinc-800 animate-pulse" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 animate-pulse">
              <div className="h-3 w-24 rounded bg-zinc-800 mb-3" />
              <div className="h-7 w-32 rounded bg-zinc-800" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="rounded-xl border border-zinc-800 overflow-hidden animate-pulse">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-zinc-800/60 last:border-0">
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

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  )
}
