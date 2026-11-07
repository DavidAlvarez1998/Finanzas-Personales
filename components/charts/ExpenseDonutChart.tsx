'use client'

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { CategoryData } from '@/lib/aggregations'
import { formatAmount } from '@/lib/format'

interface Props {
  data: CategoryData[]
  currency: string
  colors: readonly string[]
  tooltipStyle: React.CSSProperties
  tickColor?: string
}

export function ExpenseDonutChart({ data, currency, colors, tooltipStyle, tickColor = '#71717a' }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div
          className="h-28 w-28 rounded-full border-[14px] border-zinc-200 dark:border-zinc-800"
          aria-hidden
        />
        <span>Sin datos</span>
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            innerRadius={60}
            outerRadius={96}
            paddingAngle={3}
            stroke="var(--color-surface)"
            strokeWidth={2}
            isAnimationActive
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => {
              const pct = total > 0 ? (value / total) * 100 : 0
              return [`${formatAmount(value)} ${currency} (${pct.toFixed(1)}%)`, name]
            }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: tickColor }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
