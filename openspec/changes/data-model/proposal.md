# Proposal: data-model — Transaction Categories + Debt Partial Payments

## Problem

1. Transactions have no category, making it impossible to understand spending breakdown.
2. Debts have no payment tracking — once created, the only option is full deletion. Partial payments cannot be recorded and the remaining balance is unknown.

## Scope

Two additive features delivered in a single PR (~280 lines changed):

### Feature 1: Transaction Categories

Add a nullable `category text` column to `transactions`. Categories are defined at the app level as two static arrays (income / expense) in a shared constants file. The TransactionForm gains a `<select>` that changes its option list based on the current transaction type, and resets when the type changes.

**Key decision — text column, not DB enum or lookup table:**
- DB enum: requires a migration for every new category value; inflexible.
- Lookup table: overkill JOIN for a static, small, never-user-defined list.
- Text column + app-level validation: nullable, zero risk to existing rows (null is fine), categories can be added without schema changes.

### Feature 2: Debt Partial Payments

Add a `debt_payments` table that records each payment against a debt. `getDebts()` is extended with a Supabase embedded select to retrieve payments alongside each debt, then computes `total_paid` and `remaining` in the DAL.

**Key decision — separate table, embedded select:**
- Mutating `debts.amount` would destroy the historical original amount.
- A separate table preserves the full payment history.
- Supabase `.select('*, debt_payments(...)')` returns nested arrays — sums in the DAL keep the UI dumb.
- RLS on `debt_payments` uses a subquery on `public.debts` (same pattern as existing policies).

## Out of scope

- Payment history list in the UI (only the summary: original / paid / remaining is shown)
- User-defined custom categories
- Category analytics or filtering on the transactions list

## Risk summary

- `initialType` in TransactionForm has no in-form toggle today; category list depends on that static prop value and local state. Reset on type change is needed.
- DashboardShell manually rebuilds FormData from the TransactionForm `onSave` payload — `category` must be threaded through that payload too.
- `payments`, `total_paid`, `remaining` fields on Debt must NOT be serialized into update FormData — they are read-only computed fields.
- Supabase embedded select returns `[]` (not null) for debts with zero payments — handle gracefully in sum.

## Migrations required (user action)

TASK-1 and TASK-2 produce SQL migration files. **The user must apply these in the Supabase dashboard (SQL Editor) or via the Supabase CLI before deploying the code changes.**
