# Design: quick-wins

## Key Decisions

### D-1 — Logout button: `<form action={logout}>` (not startTransition)

Use a `<form action={logout}>` with a submit button. This approach works without JavaScript enabled, avoids wrapping the redirect in a transition (React warns when `redirect()` is called inside `startTransition`), and is the idiomatic Next.js 16 App Router pattern for server action forms.

Do NOT use `onClick={() => startTransition(() => logout())}` — `logout()` calls `redirect()` internally, which throws a special Next.js exception that must not be caught by transition internals.

### D-2 — isPending wiring

```ts
// DashboardShell.tsx line 30
const [isPending, startTransition] = useTransition()
// previously: const [, startTransition] = useTransition()
```

Pass `isPending` as a prop to TransactionTable and DebtSection:
```tsx
<TransactionTable ... isPending={isPending} />
<DebtSection ... isPending={isPending} />
```

Apply at button level:
```tsx
<button disabled={isPending} className={cn('...', isPending && 'opacity-50 cursor-not-allowed')}>
```

### D-3 — Search state placement

New state in TransactionTable (co-located with other filter state):
```ts
const [searchQuery, setSearchQuery] = useState('')
```

Extended `filtered` memo — search is the last step in the chain:
```ts
const filtered = useMemo(() =>
  transactions
    .filter(t => t.month === filterMonth && t.year === filterYear)
    .filter(t => !searchQuery || t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [transactions, filterMonth, filterYear, searchQuery]
)
```

Reset page to 0 when searchQuery changes (see D-6).

### D-4 — CSV export utility

Inline function inside TransactionTable (not a separate file — it's small enough):
```ts
function exportToCSV(rows: Transaction[], month: number, year: number) {
  const BOM = '﻿'
  const header = 'Fecha,Descripción,Ingresos,Egresos,Moneda'
  const body = rows.map(t =>
    [t.date, `"${t.description}"`, t.income ?? '', t.expense ?? '', t.currency ?? 'COP'].join(',')
  ).join('\n')
  const blob = new Blob([BOM + header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `registros-${year}-${String(month).padStart(2, '0')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

Called on button click: `exportToCSV(filtered, filterMonth, filterYear)` — uses the already-filtered array.

### D-5 — Multi-currency grouping

New type in `types/index.ts`:
```ts
export interface CurrencyGroup {
  currency: string
  income: number
  expense: number
  balance: number
}
```

Computed in DashboardShell (replaces lines 32–34):
```ts
const currencyGroups = useMemo((): CurrencyGroup[] => {
  const map = new Map<string, { income: number; expense: number }>()
  for (const t of transactions) {
    const key = t.currency ?? 'COP'
    const entry = map.get(key) ?? { income: 0, expense: 0 }
    map.set(key, {
      income: entry.income + (t.income ?? 0),
      expense: entry.expense + (t.expense ?? 0),
    })
  }
  return Array.from(map.entries()).map(([currency, { income, expense }]) => ({
    currency, income, expense, balance: income - expense,
  }))
}, [transactions])
```

SummaryCards new prop interface:
```ts
interface SummaryCardsProps {
  groups: CurrencyGroup[]
}
```

Renders one card row per group. Balance card color logic applies per-currency (`balance < 0` → red).

### D-6 — Pagination state

```ts
const PAGE_SIZE = 10
const [page, setPage] = useState(0)
const [showAll, setShowAll] = useState(false)
```

Reset page when filters change — add `setPage(0)` in the onChange handlers for filterMonth, filterYear, and searchQuery (or use a useEffect with those deps):
```ts
useEffect(() => { setPage(0) }, [filterMonth, filterYear, searchQuery])
```

Paginated slice (applied after filtered — totals use `filtered`):
```ts
const paginated = showAll ? filtered : filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
```

Desktop table and mobile card list both render `paginated`.
Footer totals (`monthIncome`, `monthExpense`) remain computed from `filtered`.

Pagination controls:
```tsx
{!showAll && totalPages > 1 && (
  <div className="flex items-center gap-2 mt-2">
    <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
    <span>{page + 1} / {totalPages}</span>
    <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</button>
  </div>
)}
<button onClick={() => setShowAll(v => !v)}>
  {showAll ? 'Paginar' : 'Ver todo'}
</button>
```

## Component Interface Summary

| Component | Before | After |
|-----------|--------|-------|
| `SummaryCards` | `{ totalIncome, totalExpense, balance }` | `{ groups: CurrencyGroup[] }` |
| `TransactionTable` | no `isPending` prop | `isPending: boolean` |
| `DebtSection` | no `isPending` prop | `isPending: boolean` |

## Risk Notes

- `logout` uses `redirect()` internally — MUST use `<form action={logout}>`, never wrap in `startTransition`.
- `currency` field is optional on Transaction — always default to `'COP'` when grouping.
- `URL.revokeObjectURL` MUST be called after anchor click to prevent memory leak.
- Pagination reset MUST happen when any filter changes, not just month/year.
- `filtered` (not `paginated`) drives footer totals — maintain this invariant.
