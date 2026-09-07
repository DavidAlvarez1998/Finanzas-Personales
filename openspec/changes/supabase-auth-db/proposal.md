# Proposal — Supabase Auth + PostgreSQL Persistence

**Change name:** `supabase-auth-db`
**Status:** proposed
**Owner:** David Alvarez
**Date:** 2026-09-06

---

## 1. Intent

### What we are building

Replace the localStorage-only persistence in `finanzas-app` with a real backend:

- **Authentication** via Supabase Auth (email + password to start; OAuth-ready).
- **Persistence** in Supabase PostgreSQL, one row per transaction and per debt, scoped to the authenticated user via Row Level Security (RLS).
- **Server-first Next.js 16 architecture**: `proxy.ts` for route protection, Server Components for reads, Server Actions for writes.

### Why now

The app is functionally complete as a single-user localStorage SPA but has three structural problems that block any further growth:

1. **Data is trapped in one browser.** No multi-device access, no backup, no way to recover if the user clears storage.
2. **No user model.** There is no notion of identity, so the app cannot be shared, published, or extended to any collaborative or per-user feature (categories, budgets, recurring transactions).
3. **The current `useFinanzas` hook conflates state, storage, and mutations.** Adding a backend by patching the hook would compound the coupling; a Server Component + Server Action rewrite fixes the architecture while we are already touching the data layer.

Doing auth and DB together (not sequentially) avoids two disruptive refactors of `app/page.tsx` and `useFinanzas`.

### Success criteria

- A new user can sign up, log in, log out.
- Unauthenticated requests to `/` are redirected to `/login` by `proxy.ts` (no flash of protected UI).
- Transactions and debts are stored in Supabase and visible only to their owner (verified by RLS, not just client filtering).
- All localStorage reads/writes are removed from the runtime path.
- `Debt.amount` is a `number` end-to-end (bug fix bundled in).
- The build passes with TypeScript `strict` and ESLint clean.

---

## 2. Scope

### In scope

- Supabase project provisioning (dev + prod) and env var wiring (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- SQL schema for `transactions` and `debts` tables, including RLS policies keyed on `auth.uid() = user_id`.
- `@supabase/ssr` integration: `createBrowserClient`, `createServerClient`, cookie handling helpers under `lib/supabase/`.
- `proxy.ts` at the project root, exporting `proxy` (Next.js 16 convention), with an optimistic session cookie check to guard `/`.
- `/login` route (Server Component page + client form) with Server Actions for `login`, `register`, `logout`.
- Refactor `app/page.tsx` from `'use client'` to a Server Component that fetches data server-side and passes it into a new client shell component that keeps the current UX (tabs, form modals).
- Server Actions for all mutations (add / edit / delete transaction, add / edit / delete debt) with `revalidatePath('/')`.
- Data Access Layer (DAL) helpers under `lib/supabase/dal.ts` that always verify session before touching data.
- Fix `Debt.amount` type from `string` to `number` across `types/`, components, and forms.
- Loading + error UX: Suspense boundaries in `app/page.tsx`, error boundary for the dashboard segment.

### Out of scope

- Data migration from existing localStorage installs (personal app, no live users to migrate). If needed later, a one-off client-side importer can be added.
- OAuth providers (Google, GitHub). Design leaves them plug-in ready via Supabase, but this change ships email/password only.
- Password reset / email verification flows beyond the Supabase defaults (magic link stays unshipped this round).
- Realtime subscriptions (Supabase Realtime).
- Categories, budgets, recurring transactions, multi-currency conversion — future changes.
- Automated end-to-end tests. Manual smoke test is acceptable for this iteration; unit tests may be added opportunistically inside the DAL.
- Rate limiting / abuse protection beyond Supabase defaults.

---

## 3. Approach

### Two-slice delivery

The change is split into two slices so each can ship independently and be reviewed with a bounded diff.

#### Slice 1 — Auth plumbing (foundation)

Ships a working login/logout with route protection, but the app still reads from localStorage until Slice 2 lands.

- Install `@supabase/ssr` and `@supabase/supabase-js`.
- Add env vars and `lib/supabase/{browser,server}.ts` factories.
- Create `proxy.ts` at project root, exporting a function **named `proxy`** (Next.js 16 requirement — `middleware.ts` is deprecated).
- Create `app/login/page.tsx` (Server Component) + `components/LoginForm.tsx` (client).
- Create `app/actions/auth.ts` with `login`, `register`, `logout` Server Actions.
- Add a temporary `verifySession()` call at the top of `app/page.tsx` so a signed-out user cannot reach the dashboard even if `proxy.ts` misfires (defense in depth).

**Rationale:** ships the security boundary first. Even without DB integration, this slice already prevents unauthorized access to the app shell.

#### Slice 2 — DB + state migration

Ships the actual persistence and retires `useFinanzas`.

- Apply SQL schema (see exploration for full DDL) with RLS enabled.
- Add `lib/supabase/dal.ts` with `getTransactions()`, `getDebts()`, and `getSession()` (session verification always first).
- Convert `app/page.tsx` to a Server Component that awaits the DAL and passes data as props to a new `<DashboardShell>` client component (which owns tab / modal / editing UI state that used to live in the page).
- Add Server Actions in `app/actions/{transactions,debts}.ts` for create / update / delete, each calling `revalidatePath('/')`.
- Delete `hooks/useFinanzas.ts` and its localStorage code path.
- Update `types/index.ts`: `Debt.amount: number`, add `user_id` where relevant, add `created_at`.
- Update `TransactionForm`, `DebtSection`, `TransactionTable` to invoke Server Actions via `<form action={...}>` or `useTransition` + async calls.
- Wrap async data reads in `<Suspense>` with a skeleton fallback; add `app/error.tsx` for the dashboard segment.

**Rationale:** everything user-facing changes in one coherent slice so tests and manual QA cover the whole data path in one pass.

### Sequencing note

Slice 2 depends on Slice 1 landing first. Slice 1 can be reviewed and merged independently because the app remains functional (still reading localStorage under the auth wall).

---

## 4. Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Route protection file | **`proxy.ts`** exporting `proxy` | `middleware.ts` is deprecated in Next.js 16.3.4. Verified in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md`: "The `middleware.js` file convention has been deprecated in Next.js 16 and renamed to `proxy.js`." Writing `middleware.ts` will silently not run. |
| Supabase SDK | **`@supabase/ssr`** | `@supabase/auth-helpers-nextjs` is deprecated. `@supabase/ssr` is the official App Router integration and exposes both `createBrowserClient` and `createServerClient` with correct cookie handling for Server Components and Server Actions. |
| Authorization boundary | **RLS at the database** | Client-side filtering is not a security boundary. RLS policies keyed on `auth.uid() = user_id` make the DB refuse cross-tenant reads/writes even if a bug in the app tries them. `proxy.ts` is optimistic (cookie presence only); the DAL performs the real session verification before every query. |
| Reads | **Server Components + DAL** | Eliminates a client-side loading flash, keeps the anon key useful only for authenticated cookie-bearing requests, and enables `revalidatePath` cache invalidation. |
| Writes | **Server Actions** (not API routes) | Server Actions are the native App Router mutation primitive, integrate directly with `<form action>`, and remove the need to hand-write a REST layer. API routes would add ceremony with no benefit for this app. |
| Auth flows this slice | **Email + password only** | Ships the smallest complete auth surface. OAuth and magic link are pluggable into Supabase later without schema changes. |
| Client shell | **New `<DashboardShell>` client component** | `app/page.tsx` becomes a Server Component; the existing `useState` for tabs / modals / editing moves into a dedicated client wrapper. Presentational components stay unchanged in shape. |
| Debt.amount type | **`number` (TS) / `numeric(14,2)` (DB)** | The current `string` type is a bug that would corrupt totals once the DB enforces numeric. Fix bundled here to avoid a second migration. |

---

## 5. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Someone writes `middleware.ts` out of habit | Route guard silently does not run; the app appears open. | Explicit `proxy.ts` name in tasks; add a note in `AGENTS.md` if not already covered; verify the compiled output loads the proxy after Slice 1. |
| RLS policy misconfiguration leaks data | Cross-user data exposure. | Write policies as part of Slice 2 schema migration; manual verification: log in as user A, insert a row, log in as user B, confirm the row is invisible via both the app UI and the Supabase SQL editor. |
| Supabase cookies not forwarded correctly in Server Actions | Session appears missing server-side; mutations fail. | Use `@supabase/ssr` `createServerClient` with the `cookies()` bridge exactly as documented; centralize the client factory in `lib/supabase/server.ts` so no route hand-rolls it. |
| `useFinanzas` retirement breaks a component we forgot to update | Runtime error on page load. | Search-and-replace of `useFinanzas` imports is atomic; TS strict will flag dangling references at build. |
| `Debt.amount` string→number migration breaks the debt form | Form submission fails or stores NaN. | Update `DebtSection` and its form input together; use `parseFloat` at the form edge, `number` everywhere internally, and the DB `numeric` type as the final validator. |
| Env vars missing in production | Runtime crash on first request. | Fail loud at server client construction (`throw` if `NEXT_PUBLIC_SUPABASE_URL` is undefined) so the error surfaces at build/boot, not on user click. |
| Server Component page tries to use `useState` from the old code | Build error. | Slice 2 explicitly extracts client-only state into `<DashboardShell>`; the diff makes the split obvious. |
| Rate limits or Supabase downtime | Login or data reads fail. | Out of scope this change; log errors and show a friendly `app/error.tsx` fallback. Future change can add retry/backoff. |
| No test coverage | Regressions land silently. | Manual smoke checklist in the verify phase; opportunistic DAL unit tests if setup is cheap. Automated test infrastructure is a separate future change. |

---

## 6. Files affected (high level)

### New

- `proxy.ts` (project root) — session cookie check + redirect to `/login`.
- `lib/supabase/browser.ts` — `createBrowserClient` factory.
- `lib/supabase/server.ts` — `createServerClient` factory bound to Next.js `cookies()`.
- `lib/supabase/dal.ts` — `getSession`, `getTransactions`, `getDebts`, always session-verified.
- `app/login/page.tsx` — Server Component wrapper.
- `components/LoginForm.tsx` — client form for login + register toggle.
- `app/actions/auth.ts` — `login`, `register`, `logout` Server Actions.
- `app/actions/transactions.ts` — `createTransaction`, `updateTransaction`, `deleteTransaction`.
- `app/actions/debts.ts` — `createDebt`, `updateDebt`, `deleteDebt`.
- `app/error.tsx` — dashboard segment error boundary.
- `components/DashboardShell.tsx` — client component that owns tab / modal / editing state, receives data as props.
- `supabase/migrations/0001_init.sql` (or equivalent) — schema + RLS policies.
- `.env.local.example` — documents the two required env vars.

### Modified

- `app/page.tsx` — becomes Server Component; delegates UI state to `<DashboardShell>`.
- `app/layout.tsx` — may add a global auth-aware header (logout button placement).
- `types/index.ts` — `Debt.amount: number`, `Transaction` gains optional `user_id`/`created_at` when read from DB.
- `components/DebtSection.tsx` — parseFloat at form edge; consumes numeric `amount`.
- `components/TransactionForm.tsx`, `components/TransactionTable.tsx`, `components/SummaryCards.tsx` — receive data + action callbacks via props instead of the hook.
- `package.json` — adds `@supabase/ssr`, `@supabase/supabase-js`.

### Removed

- `hooks/useFinanzas.ts` — replaced by DAL + Server Actions.
- Any residual localStorage references.

---

## 7. Next SDD phases

- `sdd-spec` — formalize contracts for the DAL, Server Actions, and RLS policies.
- `sdd-design` — cookie flow diagram, auth state machine, component tree before/after, migration SQL finalized.
- `sdd-tasks` — decompose Slice 1 and Slice 2 into ordered work units with a review workload forecast (likely two PRs).
- `sdd-apply` → `sdd-verify` → `sdd-archive`.
