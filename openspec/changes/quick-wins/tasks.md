# Tasks: quick-wins

## Checklist

### TASK-1 — `components/DashboardShell.tsx`
- [ ] Change `const [, startTransition]` to `const [isPending, startTransition]` (line ~30)
- [ ] Import `logout` from `app/actions/auth.ts`
- [ ] Add logout `<form action={logout}><button ...>Salir</button></form>` to the header div (alongside ThemeToggle)
- [ ] Apply `disabled={isPending} className={cn(..., isPending && 'opacity-50 cursor-not-allowed')}` to the "Nuevo ingreso" and "Nuevo egreso" buttons
- [ ] Remove scalar `totalIncome`, `totalExpense`, `balance` computations (lines 32–34)
- [ ] Add `CurrencyGroup` import from `types/index.ts`
- [ ] Add `currencyGroups` useMemo that groups `transactions` by `t.currency ?? 'COP'`
- [ ] Pass `groups={currencyGroups}` to `<SummaryCards />` (remove old scalar props)
- [ ] Pass `isPending={isPending}` to `<TransactionTable />`
- [ ] Pass `isPending={isPending}` to `<DebtSection />`

### TASK-2 — `types/index.ts`
- [ ] Add `CurrencyGroup` interface: `{ currency: string; income: number; expense: number; balance: number }`

### TASK-3 — `components/SummaryCards.tsx`
- [ ] Replace prop interface from `{ totalIncome, totalExpense, balance }` to `{ groups: CurrencyGroup[] }`
- [ ] Import `CurrencyGroup` from `types/index.ts`
- [ ] Render one summary row per group (map over `groups`)
- [ ] Apply balance color logic per-currency (`group.balance < 0` → red text)
- [ ] Remove old flat-number rendering logic

### TASK-4 — `components/TransactionTable.tsx`
- [ ] Accept `isPending: boolean` prop
- [ ] Add `const [searchQuery, setSearchQuery] = useState('')`
- [ ] Extend `filtered` useMemo to include description filter (case-insensitive, both sides lowercased)
- [ ] Add search `<input>` to the filter bar (placeholder "Buscar por descripción")
- [ ] Add "Exportar CSV" `<button>` to the filter bar
- [ ] Implement `exportToCSV(rows, month, year)` inline function (UTF-8 BOM, columns: Fecha/Descripción/Ingresos/Egresos/Moneda, URL.revokeObjectURL)
- [ ] Add `const [page, setPage] = useState(0)` and `const [showAll, setShowAll] = useState(false)`
- [ ] Add `useEffect(() => { setPage(0) }, [filterMonth, filterYear, searchQuery])` for filter reset
- [ ] Compute `paginated = showAll ? filtered : filtered.slice(page * 10, (page + 1) * 10)`
- [ ] Ensure `monthIncome` and `monthExpense` footer totals remain computed from `filtered` (not `paginated`)
- [ ] Replace `filtered` with `paginated` in desktop table rows and mobile card list
- [ ] Add pagination controls (Anterior / N de M / Siguiente) below the table, hidden when `showAll`
- [ ] Add "Ver todo" / "Paginar" toggle button
- [ ] Apply `disabled={isPending}` + opacity to Delete buttons

### TASK-5 — `components/DebtSection.tsx`
- [ ] Accept `isPending: boolean` prop
- [ ] Apply `disabled={isPending}` + `opacity-50 cursor-not-allowed` to the add-debt submit button
- [ ] Apply same to update-debt and delete-debt buttons

## Estimated lines changed

| File | Estimated delta |
|------|----------------|
| `DashboardShell.tsx` | ~40 lines |
| `types/index.ts` | ~6 lines |
| `SummaryCards.tsx` | ~35 lines |
| `TransactionTable.tsx` | ~80 lines |
| `DebtSection.tsx` | ~15 lines |
| **Total** | **~176 lines** |

## Delivery

Single PR. No chained PRs needed (within 400-line budget).

## Dependencies

- TASK-2 must complete before TASK-1 and TASK-3 (CurrencyGroup type needed)
- TASK-1 must complete before TASK-3/TASK-4/TASK-5 (prop changes flow from shell outward)
- TASK-3, TASK-4, TASK-5 can be done in any order after TASK-1

## Requirements coverage

| Task | Requirement |
|------|-------------|
| TASK-1 | R-1, R-2, R-5 |
| TASK-2 | R-5 |
| TASK-3 | R-5 |
| TASK-4 | R-2, R-3, R-4, R-6 |
| TASK-5 | R-2 |
