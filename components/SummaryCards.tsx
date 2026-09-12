'use client'

import type { CurrencyGroup } from '@/types'
import { formatAmount } from '@/lib/format'

interface SummaryCardsProps {
  groups: CurrencyGroup[]
  displayCurrency?: string | null
  rates?: Map<string, number>
  ratesLoading?: boolean
  ratesError?: boolean
}

const EMPTY_GROUP: CurrencyGroup = { currency: 'COP', income: 0, expense: 0, balance: 0 }

export function SummaryCards({
  groups,
  displayCurrency,
  rates,
  ratesLoading,
  ratesError,
}: SummaryCardsProps) {
  const display = groups.length === 0 ? [EMPTY_GROUP] : groups

  // Loading state
  if (displayCurrency && ratesLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50 animate-pulse">
            <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700 mb-3" />
            <div className="h-7 w-28 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        ))}
      </div>
    )
  }

  // Error fallback or no display currency — original per-currency render
  if (!displayCurrency || ratesError || !rates) {
    return (
      <div className="space-y-3">
        {ratesError && (
          <p className="text-xs text-amber-600 dark:text-amber-400 px-1">
            No se pudo obtener el tipo de cambio. Mostrando valores originales.
          </p>
        )}
        {display.map(g => (
          <div key={g.currency} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/30">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700/70 mb-1 dark:text-emerald-400/70">
                Ingresos · {g.currency}
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatAmount(g.income)}</p>
            </div>
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-5 dark:border-rose-800/40 dark:bg-rose-950/30">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-700/70 mb-1 dark:text-rose-400/70">
                Egresos · {g.currency}
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{formatAmount(g.expense)}</p>
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
                {formatAmount(g.balance)}
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Happy path — convert and consolidate
  let totalIncome = 0
  let totalExpense = 0
  for (const g of display) {
    const key = `${g.currency}_${displayCurrency}`
    const rate = rates.get(key) ?? (g.currency === displayCurrency ? 1 : null)
    if (rate == null) continue
    totalIncome += g.income * rate
    totalExpense += g.expense * rate
  }
  const totalBalance = totalIncome - totalExpense

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/30">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700/70 mb-1 dark:text-emerald-400/70">
          Ingresos · {displayCurrency}
        </p>
        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatAmount(totalIncome)}</p>
      </div>
      <div className="rounded-xl border border-rose-300 bg-rose-50 p-5 dark:border-rose-800/40 dark:bg-rose-950/30">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-700/70 mb-1 dark:text-rose-400/70">
          Egresos · {displayCurrency}
        </p>
        <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{formatAmount(totalExpense)}</p>
      </div>
      <div className={`rounded-xl border p-5 ${
        totalBalance >= 0
          ? 'border-sky-300 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-950/30'
          : 'border-amber-300 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/30'
      }`}>
        <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${
          totalBalance >= 0 ? 'text-sky-700/70 dark:text-sky-400/70' : 'text-amber-700/70 dark:text-amber-400/70'
        }`}>
          Saldo · {displayCurrency}
        </p>
        <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-sky-700 dark:text-sky-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {formatAmount(totalBalance)}
        </p>
      </div>
    </div>
  )
}
