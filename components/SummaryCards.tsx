'use client'

import type { CurrencyGroup } from '@/types'

interface SummaryCardsProps {
  groups: CurrencyGroup[]
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}

const EMPTY_GROUP: CurrencyGroup = { currency: 'COP', income: 0, expense: 0, balance: 0 }

export function SummaryCards({ groups }: SummaryCardsProps) {
  const display = groups.length === 0 ? [EMPTY_GROUP] : groups

  return (
    <div className="space-y-3">
      {display.map(g => (
        <div key={g.currency} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/30">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700/70 mb-1 dark:text-emerald-400/70">
              Ingresos · {g.currency}
            </p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fmt(g.income)}</p>
          </div>

          <div className="rounded-xl border border-rose-300 bg-rose-50 p-5 dark:border-rose-800/40 dark:bg-rose-950/30">
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-700/70 mb-1 dark:text-rose-400/70">
              Egresos · {g.currency}
            </p>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{fmt(g.expense)}</p>
          </div>

          <div className={`rounded-xl border p-5 ${
            g.balance >= 0
              ? 'border-sky-300 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-950/30'
              : 'border-amber-300 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/30'
          }`}>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${
              g.balance >= 0 ? 'text-sky-700/70 dark:text-sky-400/70' : 'text-amber-700/70 dark:text-amber-400/70'
            }`}>
              Saldo · {g.currency}
            </p>
            <p className={`text-2xl font-bold ${g.balance >= 0 ? 'text-sky-700 dark:text-sky-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {fmt(g.balance)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
