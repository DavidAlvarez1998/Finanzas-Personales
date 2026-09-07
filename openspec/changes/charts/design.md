# Design: Charts — Technical Design

## Component Tree

```
DashboardShell (existing, 'use client')
└── ChartsSection (new, 'use client')
    ├── currency <select> (conditional — only if >1 currency)
    ├── MonthlyTrendChart (new)
    └── DistributionChart (new)

lib/aggregations.ts (new)
  └── groupByMonth(transactions, currency): MonthSummary[]
```

## File Map

| File | Status | Role |
|---|---|---|
| `lib/aggregations.ts` | New | Pure aggregation function |
| `components/charts/MonthlyTrendChart.tsx` | New | recharts BarChart presenter |
| `components/charts/DistributionChart.tsx` | New | recharts PieChart donut presenter |
| `components/ChartsSection.tsx` | New | Container — mounted guard, currency selector, layout |
| `components/DashboardShell.tsx` | Modified | Add 'charts' tab |

## Data Contract

### `groupByMonth`

```ts
// lib/aggregations.ts
export function groupByMonth(
  transactions: Transaction[],
  currency: string
): MonthSummary[]
```

- Filter `transactions` by `t.currency === currency`
- Group by `YYYY-MM` key derived from `t.date`
- Sum `t.income ?? 0` and `t.expense ?? 0` per group
- Derive `balance = totalIncome - totalExpense`
- Return last 12 entries sorted ascending by date
- `MonthSummary` is already defined in `types/index.ts`

### `MonthlyTrendChart` props

```ts
interface Props {
  data: MonthSummary[]  // pre-aggregated, sorted ascending
}
```

### `DistributionChart` props

```ts
interface Props {
  income: number
  expense: number
}
```

### `ChartsSection` props

```ts
interface Props {
  transactions: Transaction[]
}
```

## Color Reading

recharts SVG elements cannot consume Tailwind utility classes. Colors must be resolved to hex/rgb at runtime:

```ts
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// Usage in JSX (client-only, called after mount):
<Bar dataKey="totalIncome" fill={getCSSVar('--color-income')} />
```

Call `getCSSVar` inside the render body (not at module level) so it re-reads on theme change. For reactive theme changes, read inside a `useMemo` that depends on a theme state, or simply re-read on each render (fast, no allocation concerns).

## Mounted Guard

Prevents SSR hydration mismatch for recharts (which uses ResizeObserver):

```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])

if (!mounted) {
  return <div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
}
```

Applied in `ChartsSection` — single guard covers both child charts.

## recharts Components Used

### MonthlyTrendChart
```
ResponsiveContainer (width="100%", height={256})
  BarChart (data={data})
    XAxis (dataKey="month")
    YAxis
    Tooltip
    Legend
    Bar (dataKey="totalIncome", fill={getCSSVar('--color-income')})
    Bar (dataKey="totalExpense", fill={getCSSVar('--color-expense')})
```

### DistributionChart
```
ResponsiveContainer (width="100%", height={256})
  PieChart
    Pie (data=[{name:'Ingresos',value:income},{name:'Gastos',value:expense}],
         innerRadius={60}, outerRadius={100}, paddingAngle={4})
      Cell (fill=income color)
      Cell (fill=expense color)
    Tooltip (formatter: show %)
    Legend
```

## DashboardShell Changes

```ts
// Before
type Tab = 'transactions' | 'debts'

// After
type Tab = 'transactions' | 'debts' | 'charts'
```

Add tab button:
```tsx
<button onClick={() => setActiveTab('charts')} ...>Graficos</button>
```

Add panel:
```tsx
{activeTab === 'charts' && <ChartsSection transactions={transactions} />}
```

## Currency Selector

```tsx
const currencies = [...new Set(transactions.map(t => t.currency).filter(Boolean))] as string[]
const [currency, setCurrency] = useState('COP')

{currencies.length > 1 && (
  <select value={currency} onChange={e => setCurrency(e.target.value)}>
    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
  </select>
)}
```

## Layout

`ChartsSection` renders a `grid grid-cols-1 md:grid-cols-2 gap-6` — trend chart and donut side by side on medium+ screens, stacked on mobile. Each chart is wrapped in a card div (`rounded-xl border p-4`).
