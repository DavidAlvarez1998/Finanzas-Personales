'use client'

import { useState, useEffect } from 'react'
import { groupByMonth, groupByCategory } from '@/lib/aggregations'
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart'
import { CategoryChart } from '@/components/charts/CategoryChart'
import type { Transaction } from '@/types'

interface Props {
  transactions: Transaction[]
}

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function ChartsSection({ transactions }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const currencies = Array.from(new Set(transactions.map(t => t.currency ?? 'COP')))
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0] ?? 'COP')

  const monthData = groupByMonth(transactions, selectedCurrency)
  const expenseByCategory = groupByCategory(transactions, selectedCurrency, 'expense')
  const incomeByCategory = groupByCategory(transactions, selectedCurrency, 'income')

  const incomeColor = getCSSVar('--color-income') || '#10b981'
  const expenseColor = getCSSVar('--color-expense') || '#f43f5e'

  const tooltipStyle: React.CSSProperties = {
    fontSize: 12,
    borderRadius: 8,
    backgroundColor: getCSSVar('--color-surface') || '#18181b',
    border: `1px solid ${getCSSVar('--color-border') || '#3f3f46'}`,
    color: getCSSVar('--color-text') || '#fafafa',
  }

  if (!mounted) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
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

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Tendencia mensual ({selectedCurrency})
        </h3>
        <MonthlyTrendChart
          data={monthData}
          incomeColor={incomeColor}
          expenseColor={expenseColor}
          tooltipStyle={tooltipStyle}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Top gastos por categoría ({selectedCurrency})
        </h3>
        <CategoryChart
          data={expenseByCategory}
          color={expenseColor}
          tooltipStyle={tooltipStyle}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Top ingresos por categoría ({selectedCurrency})
        </h3>
        <CategoryChart
          data={incomeByCategory}
          color={incomeColor}
          tooltipStyle={tooltipStyle}
        />
      </div>
    </div>
  )
}
