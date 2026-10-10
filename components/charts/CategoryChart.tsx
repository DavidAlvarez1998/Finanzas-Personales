'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { CategoryData } from '@/lib/aggregations'
import { formatAmount } from '@/lib/format'

interface Props {
  data: CategoryData[]
  color: string
  tooltipStyle: React.CSSProperties
}

export function CategoryChart({ data, color, tooltipStyle }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
        Sin datos
      </div>
    )
  }

  return (
    <div style={{ height: Math.max(120, data.length * 36) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 10 }}
            stroke="currentColor"
            strokeOpacity={0.3}
            tickFormatter={n => `$${(n / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={120}
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            strokeOpacity={0.3}
          />
          <Tooltip
            formatter={(value: number) => [formatAmount(value), 'Total']}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} fillOpacity={Math.max(0.35, 1 - i * 0.08)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
