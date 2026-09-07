# Verify Report — data-model
**Change**: data-model (categories + debt payments)
**Date**: 2026-09-07
**Overall**: PASSED WITH WARNINGS

---

## Task Completeness

| Task | Status |
|------|--------|
| TASK-1: migration 0004 (category column) | COMPLETE |
| TASK-2: migration 0005 (debt_payments table) | COMPLETE |
| TASK-3: lib/constants/categories.ts | COMPLETE |
| TASK-4: types/index.ts | COMPLETE |
| TASK-5: app/actions/transactions.ts | COMPLETE |
| TASK-6: app/actions/debts.ts (createDebtPayment) | COMPLETE |
| TASK-7: lib/supabase/dal.ts (getDebts embedded select) | COMPLETE |
| TASK-8: components/TransactionForm.tsx | COMPLETE |
| TASK-9: components/DashboardShell.tsx | COMPLETE |
| TASK-10: components/DebtSection.tsx | COMPLETE |
| TASK-11: components/TransactionTable.tsx | COMPLETE |

**11 / 11 tasks complete.**

---

## Build / Type-check Evidence

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS — no output (zero errors) |

---

## Spec Compliance Matrix

| Req | Status | Evidence |
|-----|--------|----------|
| R-1: Category dropdown filtered by income/expense | PASS | TransactionForm.tsx:124 — `(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(...)` driven by `type` state |
| R-2: Category optional, nullable, backward-compatible | PASS | Migration uses `add column if not exists category text` (no NOT NULL, no default). `Transaction.category?: string \| null`. Server actions use `\|\| null` fallback. Form submits `category: category \|\| null` |
| R-3: Category visible in TransactionTable (desktop + mobile) | PASS | Desktop: `<th>Categoría</th>` + `<td>{t.category \|\| '—'}</td>` (line 160+182). Mobile: conditional badge `{t.category && <span ...>{t.category}</span>}` (line 248) |
| R-4: Debt card shows original amount, total paid, remaining | WARNING | Partial — balance summary rendered only when `total_paid > 0` (line 98). A new debt with zero payments shows only the original amount badge, not the three-column breakdown. Spec says the card _always_ shows original/paid/remaining |
| R-5: Each debt has "+ Abonar" button opening payment form (amount + optional note) | PASS | Button at line 119. Payment modal at line 224 contains AmountInput + optional note input. One modal open at a time enforced by single `payingDebtId` string state |
| R-6: Recording payment triggers revalidatePath | PASS | `createDebtPayment` in debts.ts:131 calls `revalidatePath('/')` after successful insert |
| R-7: Payment history NOT required in UI | PASS | No payment history list rendered — only the summary row is shown |

---

## Issues

### CRITICAL
_None._

### WARNING

**W-1: R-4 — Balance summary hidden when total_paid === 0**
- **File**: `components/DebtSection.tsx` line 98
- **Code**: `{d.total_paid != null && d.total_paid > 0 && (`
- **Problem**: When a debt has no payments yet, the original/paid/remaining breakdown is invisible. The user sees only the amount badge. The spec says the card should surface all three values so the user can understand the debt state at a glance even before any payment is recorded.
- **Fix**: Change condition to `d.remaining != null` (i.e., the computed field exists) and render `total_paid` as `$0` when no payments have been made. Or always render the row and zero out paid/remaining when `total_paid` is 0.

### SUGGESTION

**S-1: Payment modal vs. inline form**
- The Learned note in the spec artifact states the payment form should be inline (not modal), one open at a time. The implementation uses a modal. The modal does satisfy the functional requirement (R-5) and enforces "one at a time" correctly. No requirement text explicitly mandates inline layout, so this is a suggestion, not a warning.
- If inline is desired, render the form inside the debt card row conditionally on `payingDebtId === d.id`.

**S-2: Category not included in CSV export**
- `exportToCSV` in TransactionTable.tsx (line 33) generates `Fecha,Descripción,Ingresos,Egresos,Moneda` — no Categoría column. Not a spec requirement but a natural extension now that category is a first-class field.

**S-3: tfoot colSpan matches column count**
- tfoot `colSpan={3}` (date + description + category) is correct for the 6-column table. Confirmed clean.

---

## Final Verdict

**PASS WITH WARNINGS**

1 WARNING (W-1) — R-4 balance summary hidden for debts with zero payments. Functionally works after first payment but degrades the new-debt experience. Recommend fixing before archive.
0 CRITICAL issues.
