'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtNumber } from '@/lib/format'

interface Props {
  income: number
  expense: number
  incomeColor: string
  expenseColor: string
}

function fmt(n: number) {
  return `$${fmtNumber(n)}`
}

export function DistributionChart({ income, expense, incomeColor, expenseColor }: Props) {
  const total = income + expense
  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
        Sin datos para mostrar
      </div>
    )
  }

  const data = [
    { name: 'Ingresos', value: income },
    { name: 'Egresos', value: expense },
  ]

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            dataKey="value"
            label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            <Cell fill={incomeColor} />
            <Cell fill={expenseColor} />
          </Pie>
          <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
