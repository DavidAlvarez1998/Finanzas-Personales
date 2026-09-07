# Design: data-model — Transaction Categories + Debt Partial Payments

## Database

### Migration 0004 — add category to transactions

```sql
-- supabase/migrations/0004_add_category_to_transactions.sql
alter table public.transactions
  add column if not exists category text;
```

No NOT NULL, no CHECK constraint. Validated at the app layer. Existing rows stay untouched (column defaults to NULL).

### Migration 0005 — debt_payments table

```sql
-- supabase/migrations/0005_debt_payments.sql
create table public.debt_payments (
  id         uuid primary key default gen_random_uuid(),
  debt_id    uuid not null references public.debts(id) on delete cascade,
  amount     numeric(14,2) not null check (amount > 0),
  paid_at    date not null default current_date,
  note       text,
  created_at timestamptz not null default now()
);

create index on public.debt_payments (debt_id, paid_at desc);

alter table public.debt_payments enable row level security;

create policy dp_select on public.debt_payments
  for select using (
    exists (select 1 from public.debts where id = debt_id and user_id = auth.uid())
  );

create policy dp_insert on public.debt_payments
  for insert with check (
    exists (select 1 from public.debts where id = debt_id and user_id = auth.uid())
  );

create policy dp_delete on public.debt_payments
  for delete using (
    exists (select 1 from public.debts where id = debt_id and user_id = auth.uid())
  );
```

RLS pattern is identical to the one established in migration 0001. FK references `public.debts`; `auth.uid()` comes from the Supabase JWT.

---

## Types — `types/index.ts`

```ts
export interface DebtPayment {
  id: string
  debt_id: string
  amount: number
  paid_at: string
  note?: string | null
  created_at?: string
}

// Extend existing Debt interface — add at end:
export interface Debt {
  // ...existing fields...
  payments?: DebtPayment[]
  total_paid?: number   // computed in DAL
  remaining?: number    // computed in DAL: amount - total_paid
}

// Extend existing Transaction interface — add at end:
export interface Transaction {
  // ...existing fields...
  category?: string | null
}
```

---

## Constants — `lib/constants/categories.ts` (NEW)

```ts
export const INCOME_CATEGORIES = [
  'Salario',
  'Freelance',
  'Inversión',
  'Regalo',
  'Otro',
] as const

export const EXPENSE_CATEGORIES = [
  'Comida',
  'Transporte',
  'Vivienda',
  'Salud',
  'Entretenimiento',
  'Educación',
  'Ropa',
  'Servicios',
  'Otro',
] as const
```

---

## DAL — `lib/supabase/dal.ts`

`getDebts()` currently does `.select('*')`. Change to:

```ts
const { data, error } = await supabase
  .from('debts')
  .select('*, debt_payments(id, amount, paid_at, note)')
  .order('created_at', { ascending: false })

// Map to inject computed fields:
return (data ?? []).map((debt) => {
  const payments = debt.debt_payments ?? []
  const total_paid = payments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
  return {
    ...debt,
    payments,
    total_paid,
    remaining: Number(debt.amount) - total_paid,
  }
})
```

`getTransactions()` — no change needed; `SELECT *` already returns `category` once the column exists.

---

## Server Actions

### `app/actions/transactions.ts`

In both `createTransaction` and `updateTransaction`:

```ts
const category = (formData.get('category') as string | null) || null
// include in insert/update payload:
{ ..., category }
```

### `app/actions/debts.ts` — new action

```ts
export async function createDebtPayment(debtId: string, formData: FormData) {
  const supabase = await createClient()
  const amount = Number(formData.get('amount'))
  const note = (formData.get('note') as string | null) || null

  if (!amount || amount <= 0) throw new Error('Monto inválido')

  const { error } = await supabase
    .from('debt_payments')
    .insert({ debt_id: debtId, amount, note })

  if (error) throw error
  revalidatePath('/')
}
```

---

## Components

### `components/TransactionForm.tsx`

1. Import `INCOME_CATEGORIES`, `EXPENSE_CATEGORIES` from `lib/constants/categories`.
2. Add state: `const [category, setCategory] = useState<string>(initialData?.category ?? '')`
3. When `type` changes, reset category to `''` (add to existing type-change handler or in a `useEffect` on `type`).
4. Add `<select>` below description field:

```tsx
<select value={category} onChange={(e) => setCategory(e.target.value)}>
  <option value="">Sin categoría</option>
  {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
    <option key={c} value={c}>{c}</option>
  ))}
</select>
```

5. Include `category: category || null` in the `onSave` payload object.
6. Update the `onSave` prop type: `onSave: (t: Omit<Transaction, 'id'>) => void` — Transaction now has `category`, so no signature change needed, just ensure the field is passed.

### `components/DashboardShell.tsx`

In `handleTransactionSave`:

```ts
fd.set('category', t.category ?? '')
```

Add `handleDebtPayment`:

```ts
async function handleDebtPayment(debtId: string, formData: FormData) {
  startTransition(async () => {
    await createDebtPayment(debtId, formData)
  })
}
```

Pass `onPayment={handleDebtPayment}` to `<DebtSection>`.

### `components/DebtSection.tsx`

1. Add prop: `onPayment: (debtId: string, formData: FormData) => void`
2. Add state: `const [payingDebtId, setPayingDebtId] = useState<string | null>(null)`
3. Per debt card, add below existing fields:

```tsx
<div className="flex gap-4 text-sm text-muted-foreground">
  <span>Original: ${formatAmount(debt.amount)}</span>
  <span>Abonado: ${formatAmount(debt.total_paid ?? 0)}</span>
  <span>Restante: ${formatAmount(debt.remaining ?? debt.amount)}</span>
</div>

<button onClick={() => setPayingDebtId(payingDebtId === debt.id ? null : debt.id)}>
  + Abonar
</button>

{payingDebtId === debt.id && (
  <form onSubmit={(e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onPayment(debt.id, fd)
    setPayingDebtId(null)
  }}>
    <AmountInput name="amount" />
    <input name="note" type="text" placeholder="Nota (opcional)" />
    <button type="submit">Confirmar</button>
    <button type="button" onClick={() => setPayingDebtId(null)}>Cancelar</button>
  </form>
)}
```

### `components/TransactionTable.tsx`

- Desktop: add `<th>Categoría</th>` header and `<td>{t.category ?? '—'}</td>` cell after description.
- Mobile card: render `{t.category && <span className="badge">{t.category}</span>}` if present.

---

## Data Flow Summary

```
TransactionForm.onSave({ ..., category })
  → DashboardShell.handleTransactionSave
    → fd.set('category', t.category ?? '')
      → createTransaction(fd) / updateTransaction(id, fd)
        → supabase.insert/update({ ..., category })

DebtSection "+ Abonar" form submit
  → DashboardShell.handleDebtPayment(debtId, fd)
    → createDebtPayment(debtId, fd)
      → supabase.insert into debt_payments
        → revalidatePath('/') → page re-render
```

---

## Manual Migration Steps (REQUIRED before deploy)

The user must apply two SQL migrations in Supabase **before** deploying or running the updated code:

1. **Migration 0004** — `supabase/migrations/0004_add_category_to_transactions.sql`
2. **Migration 0005** — `supabase/migrations/0005_debt_payments.sql`

These can be applied via:
- Supabase Dashboard → SQL Editor → paste and run each file
- Or: `supabase db push` if the Supabase CLI is configured locally
