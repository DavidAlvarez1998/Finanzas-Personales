# Exploration: user-currencies

## Hardcoded Currency Locations

| File | Line | Value |
|------|------|-------|
| `components/TransactionForm.tsx` | 15 | `['COP', 'BRL', 'USD']` |
| `components/DebtSection.tsx` | 16 | `['COP', 'BRL', 'USD']` |
| `components/PresupuestosSection.tsx` | 18 | `['COP', 'USD', 'EUR']` |
| `components/SavingsSection.tsx` | 44 | `['COP', 'ARS', 'USD', 'EUR']` |
| `lib/aggregations.ts` | 15, 40 | `?? 'COP'` fallback |
| `app/actions/debts.ts` | 14, 48 | `?? 'ARS'` — **inconsistent** with all others |

## Currency Select Components

| Component | Line | Width | Risk |
|-----------|------|-------|------|
| `components/TransactionForm.tsx` | 100-110 | `w-20` (80px) | Truncation risk |
| `components/DebtSection.tsx` | 169-174 | `w-full` | OK |
| `components/PresupuestosSection.tsx` | 265-275 | `w-20` (80px) | **BUG: truncates** |
| `components/SavingsSection.tsx` | 367-374 | `w-full` | OK |

## PresupuestosSection Truncation Root Cause

`PresupuestosSection.tsx:265` — `<div className="w-20">` (80px hard limit).
After `px-3` padding (24px) + browser dropdown arrow (~22px), only ~34px remain for text — not enough for "COP" at `text-sm`. Fix: `w-20` → `w-24` (or `w-28`). Same fix needed in `TransactionForm.tsx`.

## DB Schema

`public.users` columns: id, email, password_hash, created_at, status, expires_at.
No currencies column. All other tables use `user_id uuid references public.users(id)`.

## Auth Pattern

```ts
const { userId } = await verifySession()
// → Supabase service-role client, explicit .eq('user_id', userId) filtering
```

## Recommended Storage: `text[]` on `public.users`

```sql
ALTER TABLE public.users
  ADD COLUMN currencies text[] NOT NULL DEFAULT '{}';
```

Empty array `{}` = not configured → fallback to default list `['COP', 'USD']`.

## Affected Files

- `components/PresupuestosSection.tsx` — fix `w-20`→`w-24`; replace `CURRENCIES` with prop
- `components/TransactionForm.tsx` — fix `w-20`→`w-24`; replace `CURRENCIES` with prop
- `components/DebtSection.tsx` — replace `CURRENCIES` with prop
- `components/SavingsSection.tsx` — replace `CURRENCIES` with prop
- `components/DashboardShell.tsx` — receive `currencies: string[]` prop, thread to children
- `lib/supabase/dal.ts` — add `getUserCurrencies()`
- `app/page.tsx` — add `getUserCurrencies()` to data fetch
- `app/actions/currencies.ts` — new: `updateUserCurrencies()` Server Action
- `components/CurrencyPicker.tsx` — new: settings UI with world currency list + flags
- `supabase/migrations/0008_user_currencies.sql` — new

## Risks

1. No static world currency list in codebase — must add one
2. Empty-state UX: silent fallback vs. onboarding prompt
3. `debts.ts` uses `'ARS'` default — should be `'COP'`
4. Migration must run before code deploy
