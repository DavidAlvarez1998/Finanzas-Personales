'use client'

import { useState, useEffect } from 'react'
import { groupByMonth, getTotals } from '@/lib/aggregations'
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart'
import { DistributionChart } from '@/components/charts/DistributionChart'
import type { Transaction } from '@/types'

interface Props {
  transactions: Transaction[]
}

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return '#000'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function ChartsSection({ transactions }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Detect available currencies
  const currencies = Array.from(new Set(transactions.map(t => t.currency ?? 'COP')))
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0] ?? 'COP')

  const monthData = groupByMonth(transactions, selectedCurrency)
  const totals = getTotals(transactions, selectedCurrency)

  const incomeColor = getCSSVar('--color-income') || '#10b981'
  const expenseColor = getCSSVar('--color-expense') || '#f43f5e'

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800" />
        <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Currency selector — only show if multiple currencies exist */}
      {currencies.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Divisa:</span>
          {currencies.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCurrency(c)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                selectedCurrency === c
                  ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Monthly trend */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Tendencia mensual ({selectedCurrency})
        </h3>
        <MonthlyTrendChart
          data={monthData}
          incomeColor={incomeColor}
          expenseColor={expenseColor}
        />
      </div>

      {/* Distribution */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Distribución ({selectedCurrency})
        </h3>
        <DistributionChart
          income={totals.income}
          expense={totals.expense}
          incomeColor={incomeColor}
          expenseColor={expenseColor}
        />
      </div>
    </div>
  )
}
