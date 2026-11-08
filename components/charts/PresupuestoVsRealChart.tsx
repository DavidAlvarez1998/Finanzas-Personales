'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatAmount } from '@/lib/format'

export interface VsRealDataItem {
  category: string
  presupuestado: number
  gastado: number
}

interface Props {
  data: VsRealDataItem[]
  tooltipStyle: React.CSSProperties
  tickColor?: string
}

export function PresupuestoVsRealChart({ data, tooltipStyle, tickColor = '#71717a' }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
        Asigná categorías a las partidas para ver el gráfico
      </div>
    )
  }

  const height = Math.max(120, data.length * 72)

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: tickColor }}
            stroke={tickColor}
            strokeOpacity={0.3}
            tickFormatter={n => {
              const k = (n / 1000).toFixed(0)
              return `${k}k`
            }}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={120}
            tick={{ fontSize: 11, fill: tickColor }}
            stroke={tickColor}
            strokeOpacity={0.3}
          />
          <Tooltip
            formatter={(value, name) => [
              formatAmount(value as number),
              name === 'presupuestado' ? 'Presupuestado' : 'Gastado',
            ]}
            contentStyle={tooltipStyle}
            labelStyle={{ color: tooltipStyle.color }}
            itemStyle={{ color: tooltipStyle.color }}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: tickColor }}
            formatter={(value) => value === 'presupuestado' ? 'Presupuestado' : 'Gastado'}
          />
          <Bar dataKey="presupuestado" fill="#0ea5e9" radius={[0, 4, 4, 0]} maxBarSize={18} />
          <Bar dataKey="gastado" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
