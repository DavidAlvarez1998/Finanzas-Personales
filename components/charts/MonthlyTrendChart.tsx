'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { MonthData } from '@/lib/aggregations'
import { formatAmount } from '@/lib/format'

interface Props {
  data: MonthData[]
  incomeColor: string
  expenseColor: string
}

export function MonthlyTrendChart({ data, incomeColor, expenseColor }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
        No hay suficientes datos para mostrar la tendencia
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.3} />
          <YAxis tickFormatter={n => `$${(n/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.3} width={52} />
          <Tooltip
            formatter={(value: number, name: string) => [formatAmount(value), name === 'income' ? 'Ingresos' : 'Egresos']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend formatter={name => name === 'income' ? 'Ingresos' : 'Egresos'} />
          <Bar dataKey="income" fill={incomeColor} radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="expense" fill={expenseColor} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
