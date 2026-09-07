# Design — Supabase Auth + DB for finanzas-app

**Change:** `supabase-auth-db` | **Date:** 2026-09-06

## 1. Technical Approach

Server-first Next.js 16 app. `proxy.ts` performs a cheap cookie check to gate `/` and redirect anon users to `/login`. `app/page.tsx` becomes a Server Component that verifies the session via a DAL and reads rows from Supabase with RLS enforcing `auth.uid() = user_id`. Interactive state (tab, modal open, editing row) is extracted into `<DashboardShell>` — a client component that submits mutations through Server Actions. After each action, `revalidatePath('/')` triggers a fresh server render. `@supabase/ssr` bridges cookies between browser, proxy, Server Components and Server Actions.

## 2. Architecture Diagram

```
Browser
  │  (cookies: sb-access-token, sb-refresh-token)
  ▼
proxy.ts (Edge)  ── unauth ──▶ redirect /login
  │ getUser() → ok
  ▼
app/page.tsx (Server Component)
  │
  ▼
lib/supabase/dal.ts  ── verifySession() → auth.getUser()
  │                    (cached per request)
  ▼
Supabase Postgres  ◀── RLS: auth.uid() = user_id
  │
  ▼ rows
DashboardShell (Client)  ── <form action={serverAction}>
  │
  ▼
app/actions/*.ts (Server Action)  ── DAL ── Supabase ── revalidatePath('/')
```

## 3. Auth State Machine

```
       ┌──────────────┐   login OK      ┌────────────┐
 ──▶   │ unauth       │ ───────────────▶│ auth       │
       │ (no cookies) │                 │ (valid JWT)│
       └──────┬───────┘◀── logout ──────┴──────┬─────┘
              │            / expiry            │
              │                                │
   proxy: redirect(/login)          proxy: allow, refresh cookie if near expiry
```

`proxy.ts` calls `supabase.auth.getUser()` (validated) — NOT `getSession()` (which trusts the cookie). On refresh it rewrites Set-Cookie via the `@supabase/ssr` cookie adapter. Expired refresh → `getUser()` returns null → redirect.

## 4. Component Tree — Before vs After

**Before:**
```
app/page.tsx  [use client]
  └─ useFinanzas()  ── localStorage
      ├─ SummaryCards
      ├─ TransactionForm
      ├─ TransactionTable
      └─ DebtSection
```

**After:**
```
app/page.tsx  [Server Component]
  ├─ verifySession()          (DAL)
  ├─ getTransactions(userId)  (DAL → RLS)
  ├─ getDebts(userId)         (DAL → RLS)
  └─ <DashboardShell tx={} debts={}>   [use client]
       ├─ <SummaryCards tx={} debts={}/>
       ├─ <TransactionForm action={createTransaction}/>
       ├─ <TransactionTable rows={} deleteAction={} editAction={}/>
       └─ <DebtSection rows={} createAction={} deleteAction={}/>
```

## 5. File Structure

| File | Action | Purpose |
|---|---|---|
| `proxy.ts` | Create | Edge guard: verify cookie, redirect anon to `/login` |
| `lib/supabase/browser.ts` | Create | `createBrowserClient` singleton for client components |
| `lib/supabase/server.ts` | Create | `createServerClient` factory bound to `next/headers` cookies |
| `lib/supabase/dal.ts` | Create | `verifySession`, `getTransactions`, `getDebts`, `insert/update/delete*` |
| `app/login/page.tsx` | Create | Server Component wrapper rendering `<LoginForm/>` |
| `components/LoginForm.tsx` | Create | Client form dispatching `login`/`register` actions |
| `app/actions/auth.ts` | Create | `login`, `register`, `logout` Server Actions |
| `app/actions/transactions.ts` | Create | `create/update/delete` transaction Server Actions |
| `app/actions/debts.ts` | Create | `create/update/delete` debt Server Actions |
| `app/error.tsx` | Create | Root error boundary |
| `components/DashboardShell.tsx` | Create | Client shell owning tab/modal/editing state |
| `supabase/migrations/0001_init.sql` | Create | Schema + RLS for `transactions`, `debts` |
| `.env.local.example` | Create | Document required env vars |
| `app/page.tsx` | Modify | Client → Server Component; reads via DAL |
| `app/layout.tsx` | Modify | Auth-aware header (user email + logout) |
| `types/index.ts` | Modify | `Debt.amount: number`; add `user_id`, `created_at` |
| `components/{SummaryCards,TransactionForm,TransactionTable,DebtSection}.tsx` | Modify | Props + actions instead of `useFinanzas` |
| `package.json` | Modify | Add `@supabase/ssr`, `@supabase/supabase-js` |
| `hooks/useFinanzas.ts` | Delete | Replaced by DAL + Server Actions |

## 6. Cookie Flow (@supabase/ssr)

| Layer | Read cookies via | Write cookies via | Notes |
|---|---|---|---|
| `proxy.ts` | `request.cookies.getAll()` | `response.cookies.set(...)` | Must return the mutated `NextResponse` for refresh to persist |
| Server Component | `cookies()` from `next/headers` | N/A (RSC can't set) | Read-only; `getUser()` cannot refresh here |
| Server Action / Route Handler | `cookies()` from `next/headers` | `cookies().set(...)` | Refreshes JWT during mutations |
| Client Component | `document.cookie` (via `createBrowserClient`) | Auto via SDK | Rare — most reads happen server-side |

Refresh policy: proxy handles rolling refresh so RSC reads never race with expiring tokens.

## 7. Mutation Data Flow

```
1. User clicks "Add transaction" in DashboardShell
2. <form action={createTransaction}> submits FormData
3. Server Action runs (server):
     a. verifySession() → userId (401 if none)
     b. Parse + validate FormData (zod-lite / manual)
     c. dal.insertTransaction({...fields, user_id: userId})
     d. Supabase INSERT → RLS check passes (user_id = auth.uid())
     e. revalidatePath('/')
4. Next.js re-runs app/page.tsx (Server Component)
5. Fresh data streams to <DashboardShell> as new props
6. React reconciles; useTransition ends pending state
```

## 8. Error Handling

| Source | Surfacing | User sees |
|---|---|---|
| Missing env var | throw in `lib/supabase/server.ts` constructor | Build/boot crash — never silent |
| Auth failure in action | Return `{ error }` from action | Inline form message |
| DAL Postgres error | throw → caught by `app/error.tsx` | "Something went wrong" + retry button |
| RLS denial | Empty result / PostgrestError | Same as any DAL error (should not happen if session ok) |
| Session expired mid-action | Action redirects `/login` | Login page with `?next=/` |
| Validation error | Return `{ fieldErrors }` | Field-level messages |

## 9. Environment Variables

| Var | Where | If missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server clients | `lib/supabase/{browser,server}.ts` throw at construction |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server clients | Same — throw immediately |
| `SUPABASE_SERVICE_ROLE_KEY` | (not used in Slice 1/2) | Reserved for future admin scripts; keep out of client bundle |

Docs live in `.env.local.example`. Fail-fast avoids runtime nulls masquerading as "logged out".

## 10. Migration SQL (final)

```sql
-- 0001_init.sql
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  description  text not null,
  income       numeric(14,2),
  expense      numeric(14,2),
  created_at   timestamptz not null default now(),
  check (income is not null or expense is not null)
);
create index on public.transactions (user_id, date desc);

create table public.debts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  description  text not null,
  amount       numeric(14,2) not null,
  currency     text not null check (char_length(currency) between 1 and 8),
  created_at   timestamptz not null default now()
);
create index on public.debts (user_id, created_at desc);

alter table public.transactions enable row level security;
alter table public.debts        enable row level security;

create policy tx_select on public.transactions for select using  (auth.uid() = user_id);
create policy tx_insert on public.transactions for insert with check (auth.uid() = user_id);
create policy tx_update on public.transactions for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy tx_delete on public.transactions for delete using  (auth.uid() = user_id);

create policy debts_select on public.debts for select using  (auth.uid() = user_id);
create policy debts_insert on public.debts for insert with check (auth.uid() = user_id);
create policy debts_update on public.debts for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy debts_delete on public.debts for delete using  (auth.uid() = user_id);
```

## 11. Type Changes

**Before** (`types/index.ts`):
```ts
export type Transaction = {
  id: string;
  date: string;
  description: string;
  income: number | null;
  expense: number | null;
};
export type Debt = {
  id: string;
  description: string;
  amount: string;      // bug
  currency: string;
};
```

**After:**
```ts
export type Transaction = {
  id: string;
  user_id: string;
  date: string;           // ISO yyyy-mm-dd
  description: string;
  income: number | null;
  expense: number | null;
  created_at: string;
};
export type Debt = {
  id: string;
  user_id: string;
  description: string;
  amount: number;         // fixed
  currency: string;
  created_at: string;
};
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
```

## 12. Critical Architecture Decisions

| # | Decision | Rejected alternative | Rationale |
|---|---|---|---|
| D1 | `proxy.ts` exporting `proxy` | `middleware.ts` w/ `middleware` | Next.js 16.3.4 deprecated `middleware.ts` — silently NOT executed. Guard would be inert, `/` would leak to anon users. Codemod: `npx @next/codemod@canary middleware-to-proxy .` |
| D2 | `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | Helpers package is deprecated; `ssr` is the official App Router primitive with correct cookie bridge for RSC/Actions/Edge |
| D3 | Server Actions | REST API routes | Native App Router mutation primitive; `<form action={fn}>` gives progressive enhancement, no client-side fetch/JSON layer, `revalidatePath` integrates natively |
| D4 | RLS as security boundary | App-level `where user_id = ?` filtering | App filter is a bug away from full-table exposure. RLS is enforced by Postgres regardless of query. Proxy is optimistic UX; DAL `verifySession()` + RLS is the real gate |
| D5 | `<DashboardShell>` client wrapper | Keep `app/page.tsx` client | Server Component needed to read Supabase server-side without loading flash and to enable `revalidatePath`. `useState` for tabs/modal must move out of RSC — hence a dedicated client shell that receives server-fetched data as props |

## 13. Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | DAL helpers, validation | Node test runner (opportunistic; no framework yet) |
| Manual | Auth flow, RLS isolation | Two users A/B: A cannot see B's rows via UI or direct SQL |
| Type | End-to-end contracts | `tsc --noEmit` in CI check |
| Lint | Style / rules | `next lint` |

E2E deferred (per proposal OUT).

## 14. Rollout

1. Provision Supabase project; set env vars locally.
2. Apply `0001_init.sql` via Supabase SQL editor.
3. Ship Slice 1 (auth wall) — app still uses localStorage under login.
4. Ship Slice 2 (DB + Server Actions) — cutover, delete `useFinanzas.ts`.
5. Manual smoke checklist in `sdd-verify`.

No data migration (personal app, no live users — per proposal).

## 15. Open Questions

- [ ] Do we want a lightweight `zod` dep for validation, or hand-rolled parsers? (Leaning hand-rolled to keep deps minimal.)
- [ ] Login page: also expose `register` inline, or separate `/register` route? (Leaning single page with tabs.)
