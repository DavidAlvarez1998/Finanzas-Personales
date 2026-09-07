# Tasks: Charts

## Dependency Graph

```
TASK-1 (install) ──┐
                   ├─► TASK-3 (MonthlyTrendChart) ──┐
TASK-2 (aggregations) ─┘                             ├─► TASK-5 (ChartsSection) ──► TASK-6 (DashboardShell)
                   └─► TASK-4 (DistributionChart) ──┘
```

## Task List

### TASK-1 — Install recharts
**Deps**: none  
**Action**: `npm install recharts@^2`  
**Verify**: `recharts` appears in `package.json` dependencies pinned to `^2.x`

---

### TASK-2 — Create `lib/aggregations.ts`
**Deps**: none  
**Action**: Create file, export `groupByMonth(transactions: Transaction[], currency: string): MonthSummary[]`

Logic:
- Import `Transaction`, `MonthSummary` from `types/index.ts` (check actual export names)
- Filter by `t.currency === currency`
- Group by `t.date.slice(0, 7)` (YYYY-MM)
- Sum `t.income ?? 0` → `totalIncome`, `t.expense ?? 0` → `totalExpense`
- `balance = totalIncome - totalExpense`
- Sort entries ascending by key
- Return last 12 entries

**Verify**: Pure function, no side effects, no imports from react or next

---

### TASK-3 — Create `components/charts/MonthlyTrendChart.tsx`
**Deps**: TASK-1, TASK-2  
**Action**: Create BarChart presenter

- `'use client'` directive
- Props: `{ data: MonthSummary[] }`
- If `data.length < 2`: render empty state div with message "No hay suficientes datos para mostrar la tendencia"
- `ResponsiveContainer` width="100%" height={256}
- Grouped `BarChart` with two `Bar` components
- Colors: `getCSSVar('--color-income')` and `getCSSVar('--color-expense')`
- Include `XAxis` (dataKey="month"), `YAxis`, `Tooltip`, `Legend`

**Spec refs**: R-2, R-4, R-5

---

### TASK-4 — Create `components/charts/DistributionChart.tsx`
**Deps**: TASK-1  
**Action**: Create PieChart donut presenter

- `'use client'` directive
- Props: `{ income: number; expense: number }`
- `ResponsiveContainer` width="100%" height={256}
- `PieChart` → `Pie` with `innerRadius={60}` `outerRadius={100}` `paddingAngle={4}`
- Data: `[{ name: 'Ingresos', value: income }, { name: 'Gastos', value: expense }]`
- Two `Cell` components with income/expense colors
- `Tooltip` formatter: show value and percentage of total
- `Legend`

**Spec refs**: R-3, R-4

---

### TASK-5 — Create `components/ChartsSection.tsx`
**Deps**: TASK-3, TASK-4  
**Action**: Create container component

- `'use client'` directive
- Props: `{ transactions: Transaction[] }`
- Mounted guard (useState + useEffect) — skeleton on false
- Currency detection: derive unique currencies from transactions
- Currency selector `<select>` — render only if `currencies.length > 1`
- Default currency: `'COP'`
- Call `groupByMonth(transactions, currency)` in `useMemo`
- Compute `totalIncome` and `totalExpense` from the aggregated data
- Layout: `grid grid-cols-1 md:grid-cols-2 gap-6`
- Each chart in a card: `rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4`
- Card title above each chart

**Spec refs**: R-6, R-7

---

### TASK-6 — Update `components/DashboardShell.tsx`
**Deps**: TASK-5  
**Action**: Add charts tab

- Add `'charts'` to `Tab` type union
- Add tab button `<button>Graficos</button>` with same styling as existing tab buttons
- Add panel: `{activeTab === 'charts' && <ChartsSection transactions={transactions} />}`
- Import `ChartsSection`

**Spec refs**: R-1

---

## Estimates

| Task | Est. lines | Notes |
|---|---|---|
| TASK-1 | 0 (install) | package.json update only |
| TASK-2 | ~30 | Pure function |
| TASK-3 | ~60 | BarChart with empty state |
| TASK-4 | ~50 | PieChart donut |
| TASK-5 | ~70 | Container + currency selector |
| TASK-6 | ~20 | Tab addition |
| **Total** | **~230** | Single PR, under 400-line budget |

## Delivery

Single PR. No chained PRs needed.
