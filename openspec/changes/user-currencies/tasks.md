# Tasks: user-currencies

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → CSS fix only (R-1) · PR 2 → migration + full feature (R-2 through R-8) |
| Delivery strategy | single-pr (exception-ok) |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | CSS width fix in PresupuestosSection + TransactionForm | PR 1 | No migration; standalone; ships immediately |
| 2 | Migration + full currencies feature (R-2 through R-8) | PR 2 | Gated on migration 0008; exception-ok approved |

---

## Phase 1: Infrastructure

- [x] 1.1 `supabase/migrations/0008_user_currencies.sql` — `ALTER TABLE public.users ADD COLUMN currencies text[] NOT NULL DEFAULT '{}'`. Satisfies: R-4, R-7.
- [x] 1.2 `lib/constants/currencies.ts` — Export `Currency` interface and `WORLD_CURRENCIES` const array with all 20 required codes (flag + code + name in Spanish). Satisfies: R-3, R-8.

## Phase 2: Core Implementation

- [x] 2.1 `lib/supabase/dal.ts` — Add `getUserCurrencies(): Promise<string[]>`; queries `public.users.currencies` for current user; returns `[]` on empty (never throws). Satisfies: R-6.
- [x] 2.2 `app/actions/currencies.ts` — `updateUserCurrencies(codes: string[])` Server Action; calls `verifySession()`; validates codes against `WORLD_CURRENCIES` allowlist; writes to DB; calls `revalidatePath('/')`. Satisfies: R-4.
- [x] 2.3 `app/actions/debts.ts` — Change default currency `?? 'ARS'` → `?? 'COP'`. Satisfies: R-8 (debts scenario).

## Phase 3: Components

- [x] 3.1 `components/CurrencyPicker.tsx` (create) — Fixed-overlay modal; props `{ selected: string[], onClose: () => void }`; search input with `useMemo` filter; toggle list (flag + code + name); sticky footer with "Guardar cambios"; calls `updateUserCurrencies` on save then `onClose`. Satisfies: R-2, R-3, R-4, R-6.
- [x] 3.2 `components/DashboardShell.tsx` — Add `currencies: string[]` to Props; compute `effectiveCurrencies` fallback; add gear icon `<button>` in header (opens picker state); render `<CurrencyPicker>`; pass `effectiveCurrencies` to all four child form components. Satisfies: R-2, R-6, R-7.

## Phase 4: Form Component Wiring

- [x] 4.1 `components/TransactionForm.tsx` — Fix `w-20` → `w-24` on currency `<select>` container; remove local `CURRENCIES` constant; accept and use `currencies: string[]` prop. Satisfies: R-1, R-5.
- [x] 4.2 `components/PresupuestosSection.tsx` — Fix `w-20` → `w-24` on currency `<select>` container; remove local `CURRENCIES` constant; accept and use `currencies: string[]` prop. Satisfies: R-1, R-5.
- [x] 4.3 `components/DebtSection.tsx` — Remove local `CURRENCIES` constant; accept and use `currencies: string[]` prop. Satisfies: R-5.
- [x] 4.4 `components/SavingsSection.tsx` — Remove local `CURRENCIES` constant; accept and use `currencies: string[]` prop. Satisfies: R-5.
- [x] 4.5 `app/page.tsx` — Add `getUserCurrencies()` to the existing `Promise.all`; pass result as `currencies` prop to `<DashboardShell>`. Satisfies: R-6.

## Phase 5: Testing

- [ ] 5.1 Unit: `getUserCurrencies` — returns `[]` on empty column; returns populated array when column has codes. Mock Supabase client.
- [ ] 5.2 Unit: `updateUserCurrencies` — rejects codes not in `WORLD_CURRENCIES` allowlist; rejects unauthenticated call; writes correct array on valid input.
- [ ] 5.3 Unit: `DashboardShell` — renders `['COP', 'USD']` fallback when `currencies=[]`; passes stored array unchanged when non-empty.
- [ ] 5.4 Unit: `CurrencyPicker` — search filter narrows list by code and name (case-insensitive); empty query shows all; no-match shows empty-state message.
- [ ] 5.5 Integration: `page.tsx` — `Promise.all` includes `getUserCurrencies`; prop flows to `DashboardShell`.
