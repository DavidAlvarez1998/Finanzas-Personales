import { Suspense } from 'react'
import { getTransactions, getDebts, getPresupuestos, getSavingsGoals, getInvestments, getAhorroAccounts, getUserSettings } from '@/lib/supabase/dal'
import { verifySession, getSession } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/DashboardShell'
import { redirect } from 'next/navigation'

const OFFLINE_ENABLED = process.env.NEXT_PUBLIC_OFFLINE === '1'

async function Dashboard() {
  if (OFFLINE_ENABLED) {
    const session = await getSession()
    if (!session) redirect('/login')
    const isSuperadmin = session.email === process.env.SUPERADMIN_EMAIL
    return (
      <DashboardShell
        userId={session.userId}
        transactions={null}
        debts={null}
        presupuestos={null}
        savingsGoals={null}
        investments={null}
        ahorroAccounts={null}
        currencies={null}
        displayCurrency={null}
        userEmail={session.email}
        isSuperadmin={isSuperadmin}
      />
    )
  }

  const { userId, email: userEmail, isSuperadmin } = await verifySession()
  const supabase = createServerClient()

  const [transactions, debts, presupuestos, savingsGoals, investments, ahorroAccounts, settings] = await Promise.all([
    getTransactions(supabase, userId),
    getDebts(supabase, userId),
    getPresupuestos(supabase, userId),
    getSavingsGoals(supabase, userId),
    getInvestments(supabase, userId),
    getAhorroAccounts(supabase, userId),
    getUserSettings(supabase, userId),
  ])
  const { currencies, displayCurrency } = settings

  return (
    <DashboardShell
      userId={userId}
      transactions={transactions}
      debts={debts}
      presupuestos={presupuestos}
      savingsGoals={savingsGoals}
      investments={investments}
      ahorroAccounts={ahorroAccounts}
      currencies={currencies}
      displayCurrency={displayCurrency}
      userEmail={userEmail}
      isSuperadmin={isSuperadmin}
    />
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-800 animate-pulse" />
            <div className="h-4 w-40 rounded bg-zinc-800/60 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-lg bg-zinc-800 animate-pulse" />
            <div className="h-9 w-24 rounded-lg bg-zinc-800 animate-pulse" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl border border-border bg-zinc-900/50 p-5 animate-pulse">
              <div className="h-3 w-24 rounded bg-zinc-800 mb-3" />
              <div className="h-7 w-32 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border overflow-hidden animate-pulse">
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
