# Proposal: User-Managed Currencies

## Intent

Two related problems in the finanzas-app currency layer:

1. **Truncation bug** — `PresupuestosSection.tsx` and `TransactionForm.tsx` wrap their currency `<select>` in `w-20` (80px). After `px-3` padding (24px) and the browser dropdown arrow (~22px), only ~34px remain for text — enough to clip "COP" visually. Affects `PresupuestosSection.tsx:265` and `TransactionForm.tsx:100`.

2. **Hardcoded, inconsistent currency lists** — four components each define their own `CURRENCIES` array with divergent values (three different sets: `['COP','BRL','USD']`, `['COP','USD','EUR']`, `['COP','ARS','USD','EUR']`). `app/actions/debts.ts` defaults to `'ARS'` while every other file defaults to `'COP'` — a copy-paste bug. Users cannot choose which currencies they want to work with.

## Scope

### In Scope

- Fix `w-20` → `w-24` in `PresupuestosSection.tsx` and `TransactionForm.tsx`
- Add `currencies text[] NOT NULL DEFAULT '{}'` column to `public.users`
- New DAL: `getUserCurrencies(userId: string): Promise<string[]>` in `lib/supabase/dal.ts`
- New Server Action: `updateUserCurrencies(codes: string[])` in `app/actions/currencies.ts`
- New component: `CurrencyPicker` — settings modal accessible from a gear icon in the dashboard header; renders a world currency list (flag emoji + code) from a static JSON
- Prop-thread `currencies: string[]` from `app/page.tsx` → `DashboardShell` → all four form components, replacing local `CURRENCIES` constants
- Fix `debts.ts` inconsistent default (`'ARS'` → `'COP'`)
- Static world currency JSON file (`lib/data/currencies.json`) — ISO 4217 codes + flag emoji

### Out of Scope

- Per-currency metadata (display order, default currency, custom labels) — deferred to a potential `user_currencies` table migration
- A dedicated `/settings` route — the picker lives as a header modal only
- Multi-user admin override of currencies
- Currency conversion or exchange rates
- `verifySession()` returning currencies inline (separate DAL call on page load only)

## Capabilities

### New Capabilities

- `user-currencies`: Per-user currency preference — storage, retrieval, update Server Action, and settings UI that surfaces across all transaction forms

### Modified Capabilities

- None — the four form components change implementation (prop vs. constant) but their user-facing behavior spec is unchanged

## Approach

**Storage**: `text[]` column on `public.users`. One migration, no extra table, no join — consistent with existing ad-hoc columns (`status`, `expires_at`) on that table. Empty array = not configured → fall back to `['COP', 'USD']` in `DashboardShell`.

**Data flow**: `app/page.tsx` adds `getUserCurrencies()` to the existing `Promise.all`. The result flows as a single `currencies` prop through `DashboardShell` to all four form components. No global state, no Context — plain prop drilling keeps the data path auditable.

**Settings UI**: Gear icon in the dashboard header triggers a modal with a searchable list of world currencies (flag emoji + code). On submit it calls `updateUserCurrencies()` and revalidates the dashboard path. Static JSON source avoids an npm dependency.

**Delivery units**: Two sequential PRs — (1) truncation fix alone (2 lines changed), (2) full feature.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/0008_user_currencies.sql` | New | Add `currencies text[]` column |
| `lib/supabase/dal.ts` | Modified | Add `getUserCurrencies()` |
| `lib/data/currencies.json` | New | Static world currency list (code + flag) |
| `app/actions/currencies.ts` | New | `updateUserCurrencies()` Server Action |
| `app/page.tsx` | Modified | Add parallel fetch for currencies |
| `components/DashboardShell.tsx` | Modified | Accept + thread `currencies` prop; apply default fallback |
| `components/CurrencyPicker.tsx` | New | Settings modal with searchable currency list |
| `components/TransactionForm.tsx` | Modified | Remove local `CURRENCIES`; accept prop; fix `w-20` |
| `components/DebtSection.tsx` | Modified | Remove local `CURRENCIES`; accept prop |
| `components/PresupuestosSection.tsx` | Modified | Remove local `CURRENCIES`; accept prop; fix `w-20` |
| `components/SavingsSection.tsx` | Modified | Remove local `CURRENCIES`; accept prop |
| `app/actions/debts.ts` | Modified | Fix `'ARS'` default → `'COP'` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration must run before code deploy | High (ordering risk) | Migration PR ships first; feature PR deploys after |
| World currency list source adds repo weight | Low | Static JSON cap at ~200 entries (~10 KB); tree-shakeable |
| Empty-state UX ambiguity (silent fallback vs. prompt) | Low | Silent fallback to `['COP', 'USD']`; gear icon always visible |
| `debts.ts` default bug (`'ARS'`) affects existing data | Low | Default is only a code fallback, not stored — safe to fix |

## Rollback Plan

- **PR 1 (truncation fix)**: Revert the two-line diff. No data impact.
- **PR 2 (feature)**: Revert the feature branch. The `currencies` column remains in the DB with `DEFAULT '{}'` — inert. If rollback is needed before migration, the column was never added.

## Dependencies

- Supabase migration deployed to the target environment before feature code is live

## Success Criteria

- [ ] `PresupuestosSection` and `TransactionForm` currency dropdowns display "COP" without clipping at all viewport sizes
- [ ] User can open the currency picker, select 1–N currencies, save, and see all four form dropdowns update on next page load
- [ ] A new user with no stored currencies sees `['COP', 'USD']` by default
- [ ] `app/actions/debts.ts` default currency is `'COP'` (consistent with all other actions)
- [ ] No `CURRENCIES` constant remains in any component file
