# Tasks: Supabase Auth + DB for finanzas-app

**Change:** `supabase-auth-db` | **Date:** 2026-09-06 | **Delivery:** Two-slice

---

## Review Workload Forecast

| Field | Value |
|-------|----------|
| Estimated changed lines | 650–850 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Slice 1 (T01–T07) → PR 1 · Slice 2 (T08–T17) → PR 2 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| Slice 1 | Auth wall + route protection | PR 1 | Base: main. Ships a login screen and proxy guard; localStorage still works behind the wall. |
| Slice 2 | DB + Server Actions + state migration | PR 2 | Base: PR 1 branch (or main after merge). Cuts over from localStorage to Supabase. Depends on Slice 1 being merged. |

---

## Slice 1 — Auth Plumbing (PR 1)

### Phase 1: Foundation

- [ ] **T01** — `S` — Install deps + env vars
  - `package.json` (modify): add `@supabase/ssr`, `@supabase/supabase-js`
  - `.env.local.example` (create): document `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Acceptance: `next build` resolves the new packages; `.env.local.example` exists with both vars.
  - Deps: none

- [ ] **T02** — `S` — Supabase client factories
  - `lib/supabase/browser.ts` (create): `createBrowserClient` singleton; throws if env vars missing
  - `lib/supabase/server.ts` (create): `createServerClient` bound to `next/headers` cookies; throws if env vars missing
  - Acceptance: both files export typed clients; `tsc --noEmit` passes; missing env throws at construction.
  - Deps: T01

### Phase 2: Core Implementation

- [ ] **T03** — `M` — Auth Server Actions
  - `app/actions/auth.ts` (create): `login(FormData)`, `register(FormData)`, `logout()`
  - Each action calls the server Supabase client; on success redirects; on error returns `{ error: string }`
  - Acceptance: `login` redirects to `/` on valid creds; returns `{ error }` on wrong password; `logout` clears cookie + redirects to `/login`.
  - Deps: T02

- [ ] **T04** — `M` — LoginForm client component
  - `components/LoginForm.tsx` (create): client component with login/register toggle; dispatches `login`/`register` actions; renders inline error
  - Acceptance: toggle switches between modes; error returned by action renders without full reload; form submits via `<form action={...}>`.
  - Deps: T03

- [ ] **T05** — `S` — `/login` page
  - `app/login/page.tsx` (create): Server Component wrapper rendering `<LoginForm>`; already-authed users redirect to `/`
  - Acceptance: unauthenticated visitors see the form; authenticated visitors are redirected immediately.
  - Deps: T04

- [ ] **T06** — `M` — proxy.ts route guard (CRITICAL)
  - `proxy.ts` (create, **project root**): exports a function named `proxy` (NOT `middleware`, NOT `default`); calls `supabase.auth.getUser()` (validated); redirects unauthenticated requests to `/login`; returns mutated `NextResponse` with cookies
  - Acceptance: visiting `/` without a session cookie in a browser results in redirect to `/login`; authenticated request passes through; `proxy` is a named export (not default).
  - Deps: T02

- [ ] **T07** — `S` — Defense-in-depth verifySession in app/page.tsx
  - `app/page.tsx` (modify): add `verifySession()` call at top using server Supabase client; redirect to `/login` if no session
  - Acceptance: a request that bypasses proxy still redirects; `app/page.tsx` remains a Server Component.
  - Deps: T02, T06

---

## Slice 2 — DB + State Migration (PR 2)

> **Depends on Slice 1 (T01–T07) being merged before starting.**

### Phase 1: Foundation

- [ ] **T08** — `M` — SQL schema + RLS migration
  - `supabase/migrations/0001_init.sql` (create): `transactions` + `debts` tables with `user_id` FK; per-operation RLS policies (`select`, `insert`, `update`, `delete`); indexes on `(user_id, date desc)` and `(user_id, created_at desc)`
  - Acceptance: migration applies cleanly to local Supabase; `select * from transactions` as anon returns 0 rows (RLS active); two users cannot see each other's rows.
  - Deps: T01

- [ ] **T12** — `S` — Fix types/index.ts (must precede component changes)
  - `types/index.ts` (modify): `Debt.amount: number` (was `string`); add `user_id: string`, `created_at: string` to both types; add `ActionResult<T>` union type
  - Acceptance: `tsc --noEmit` passes; no `parseFloat` in non-edge code.
  - Deps: none (can run in parallel with T08)

### Phase 2: Core Implementation

- [ ] **T09** — `M` — DAL: getSession, getTransactions, getDebts
  - `lib/supabase/dal.ts` (create): `getSession()` using `auth.getUser()` (throws/redirects on null); `getTransactions()` and `getDebts()` each call `getSession()` first then query Supabase
  - Acceptance: `getTransactions()` returns only rows for the current user; calling with no session redirects before executing any DB query.
  - Deps: T02, T08, T12

- [ ] **T10** — `M` — Transaction Server Actions
  - `app/actions/transactions.ts` (create): `createTransaction(FormData)`, `updateTransaction(id, data)`, `deleteTransaction(id)`; each verifies session, operates with `user_id = auth.uid()` (RLS enforced), calls `revalidatePath('/')`
  - Acceptance: creating inserts with correct `user_id`; update/delete only affects caller's rows (0 rows affected for other-user IDs); `revalidatePath('/')` fires on every success.
  - Deps: T09

- [ ] **T11** — `M` — Debt Server Actions
  - `app/actions/debts.ts` (create): `createDebt(FormData)`, `updateDebt(id, data)`, `deleteDebt(id)` — same session-verify + revalidate pattern as T10
  - Acceptance: same criteria as T10 for the `debts` table; `amount` stored as numeric.
  - Deps: T09

### Phase 3: Integration / Wiring

- [ ] **T13** — `L` — DashboardShell client component
  - `components/DashboardShell.tsx` (create): client component receiving `transactions: Transaction[]` and `debts: Debt[]` as props; owns tab/modal/editing state currently in `useFinanzas`; wires `SummaryCards`, `TransactionForm`, `TransactionTable`, `DebtSection` to Server Actions via `<form action={...}>`
  - Acceptance: all interactive state lives here; no `useFinanzas` import; form submissions trigger Server Actions.
  - Deps: T10, T11

- [ ] **T14** — `M` — Refactor app/page.tsx to Server Component
  - `app/page.tsx` (modify): remove all client hooks; add `verifySession()` + `getTransactions()` + `getDebts()` calls; render `<Suspense>` boundary wrapping `<DashboardShell tx={transactions} debts={debts} />`
  - Acceptance: page fetches server-side; no `"use client"` in this file; `<Suspense>` with loading fallback is present.
  - Deps: T09, T13

- [ ] **T15** — `M` — Update child components to use Server Actions
  - `components/SummaryCards.tsx`, `components/TransactionForm.tsx`, `components/TransactionTable.tsx`, `components/DebtSection.tsx` (modify): replace `useFinanzas` callbacks with Server Action imports or prop-passed action refs; `Debt.amount` used as `number`
  - Acceptance: no component calls `useFinanzas`; `tsc --noEmit` passes; forms submit without JS (progressive enhancement).
  - Deps: T13, T12

- [ ] **T14b** — `S` — Auth header in app/layout.tsx
  - `app/layout.tsx` (modify): render logged-in user email + logout button using server Supabase client
  - Acceptance: authenticated users see email + logout; unauthenticated layout renders without error.
  - Deps: T03, T07

### Phase 4: Cleanup

- [ ] **T16** — `S` — Delete useFinanzas hook + localStorage refs
  - `hooks/useFinanzas.ts` (delete)
  - All files that imported it: remove import, ensure no remaining `localStorage` calls
  - Acceptance: `rg "useFinanzas|localStorage"` returns 0 matches in `app/` and `components/`.
  - Deps: T15

- [ ] **T17** — `S` — Error boundary + Suspense polish
  - `app/error.tsx` (create): root error boundary with retry button and user-friendly message
  - `app/page.tsx` (modify): ensure `<Suspense fallback={<Loading />}>` wraps the async subtree
  - Acceptance: throwing inside a Server Component renders error UI, not a blank page; Suspense fallback visible during slow load.
  - Deps: T14

---

## Dependency Order Summary

```
T01 → T02 → T03 → T04 → T05
                ↘
      T02 → T06 → T07          ← END of Slice 1

T08 ──────────────────────────┐
T12 ──────────────────────────┤
           ↓                  ↓
          T09 → T10 → T13 → T14 → T14b
               → T11 → T13        → T15 → T16
                                   → T17
```

Parallel opportunities within Slice 2: **T08 and T12** can start simultaneously.
**T10 and T11** can run in parallel once T09 is done.
