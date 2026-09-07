# Tasks: data-model — Transaction Categories + Debt Partial Payments

Estimated changed lines: ~280. Single PR.

---

## ⚠️ MANUAL STEPS REQUIRED BEFORE CODE DEPLOY

**TASK-1 and TASK-2 produce SQL migration files that MUST be run in Supabase before the code is deployed.**

The user must apply both migrations via:
- Supabase Dashboard → SQL Editor → paste and run each file, OR
- `supabase db push` (if Supabase CLI is configured)

Do NOT deploy the code changes until both migrations are applied. The code changes in TASK-4 onwards depend on the new columns/tables existing in the database.

---

## Tasks

### TASK-1 — Migration: add category column
**File:** `supabase/migrations/0004_add_category_to_transactions.sql` (NEW)

```sql
alter table public.transactions
  add column if not exists category text;
```

Status: [ ] done
**USER ACTION REQUIRED: Run this in Supabase before deploying.**

---

### TASK-2 — Migration: create debt_payments table
**File:** `supabase/migrations/0005_debt_payments.sql` (NEW)

Full SQL: see design.md — includes table, index, RLS enable, and three policies (dp_select, dp_insert, dp_delete).

Status: [ ] done
**USER ACTION REQUIRED: Run this in Supabase before deploying.**

---

### TASK-3 — Create categories constants file
**File:** `lib/constants/categories.ts` (NEW)

Export `INCOME_CATEGORIES` and `EXPENSE_CATEGORIES` as `as const` arrays.

Status: [ ] done

---

### TASK-4 — Update types
**File:** `types/index.ts`

- Add `category?: string | null` to `Transaction` interface
- Add new `DebtPayment` interface
- Add `payments?: DebtPayment[]`, `total_paid?: number`, `remaining?: number` to `Debt` interface

Status: [ ] done

---

### TASK-5 — Update transaction server actions
**File:** `app/actions/transactions.ts`

- In `createTransaction`: parse `category` from FormData, include in insert payload
- In `updateTransaction`: parse `category` from FormData, include in update payload

Status: [ ] done

---

### TASK-6 — Add createDebtPayment server action
**File:** `app/actions/debts.ts`

Add `createDebtPayment(debtId: string, formData: FormData)`:
- Parse `amount` (required, > 0) and `note` (optional)
- Insert into `debt_payments`
- Call `revalidatePath('/')`

Status: [ ] done

---

### TASK-7 — Extend getDebts() with embedded payments
**File:** `lib/supabase/dal.ts`

Change `.select('*')` to `.select('*, debt_payments(id, amount, paid_at, note)')` in `getDebts()`.

Map results to compute `total_paid` and `remaining` per debt.

Status: [ ] done

---

### TASK-8 — Update TransactionForm with category select
**File:** `components/TransactionForm.tsx`

- Import category constants
- Add `category` state (default `''`)
- Reset category when `type` changes
- Add `<select>` with dynamic options based on type
- Include `category: category || null` in `onSave` payload

Status: [ ] done

---

### TASK-9 — Update DashboardShell
**File:** `components/DashboardShell.tsx`

- In `handleTransactionSave`: add `fd.set('category', t.category ?? '')`
- Add `handleDebtPayment(debtId, formData)` handler that calls `createDebtPayment`
- Pass `onPayment={handleDebtPayment}` to `<DebtSection>`

Status: [ ] done

---

### TASK-10 — Update DebtSection with payment UI
**File:** `components/DebtSection.tsx`

- Add `onPayment` prop
- Add `payingDebtId` state
- Per debt card: show Original / Abonado / Restante summary
- Add "+ Abonar" button that toggles mini form (only one open at a time)
- Mini form: AmountInput + optional note + Confirmar/Cancelar buttons

Status: [ ] done

---

### TASK-11 — Update TransactionTable with category column
**File:** `components/TransactionTable.tsx`

- Desktop: add "Categoría" column header and cell (show `'—'` if null)
- Mobile card: show category badge if present

Status: [ ] done

---

## Dependency order

```
TASK-1, TASK-2  (migrations — user runs manually)
  ↓
TASK-3, TASK-4  (constants + types — no deps on each other)
  ↓
TASK-5, TASK-6  (actions — depend on types)
  ↓
TASK-7          (DAL — depends on types + migration)
  ↓
TASK-8, TASK-10, TASK-11  (UI components — depend on types + constants)
  ↓
TASK-9          (DashboardShell — depends on all above)
```

TASK-3 and TASK-4 can be implemented in any order. TASK-5, TASK-6, TASK-7 can be implemented in parallel. TASK-8, TASK-10, TASK-11 can be implemented in parallel.

## Delivery

Single PR. ~280 lines. No chaining needed.
