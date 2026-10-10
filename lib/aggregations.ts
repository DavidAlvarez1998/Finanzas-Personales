import type { Transaction } from '@/types'

export interface MonthData {
  label: string   // e.g. "Sep 26"
  month: number
  year: number
  income: number
  expense: number
}

export interface CategoryData {
  category: string
  amount: number
}

export function groupByCategory(
  transactions: Transaction[],
  currency: string,
  type: 'income' | 'expense',
): CategoryData[] {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if ((t.currency ?? 'COP') !== currency) continue
    const amount = type === 'income' ? (t.income ?? 0) : (t.expense ?? 0)
    if (amount <= 0) continue
    const cat = t.category || 'Sin categoría'
    map.set(cat, (map.get(cat) ?? 0) + amount)
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
}

export function groupByMonth(transactions: Transaction[], currency: string): MonthData[] {
  const map = new Map<string, MonthData>()

  for (const t of transactions) {
    if ((t.currency ?? 'COP') !== currency) continue
    const d = new Date(t.date.split('T')[0] + 'T00:00:00')
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) {
      map.set(key, {
        label: d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
        month: d.getMonth(),
        year: d.getFullYear(),
        income: 0,
        expense: 0,
      })
    }
    const entry = map.get(key)!
    entry.income += t.income ?? 0
    entry.expense += t.expense ?? 0
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([, v]) => v)
}

export function getTotals(transactions: Transaction[], currency: string) {
  return transactions
    .filter(t => (t.currency ?? 'COP') === currency)
    .reduce(
      (acc, t) => {
        acc.income += t.income ?? 0
        acc.expense += t.expense ?? 0
        return acc
      },
      { income: 0, expense: 0 }
    )
}
