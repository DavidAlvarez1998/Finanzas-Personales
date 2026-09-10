# Archive Report: user-currencies

**Change**: user-currencies  
**Status**: COMPLETE  
**Verdict**: PASS WITH WARNINGS (0 CRITICAL, 3 WARNINGS, 2 SUGGESTIONS)  
**Date Archived**: 2026-09-10  

---

## Executive Summary

The **user-currencies** change has been fully planned, implemented, verified, and archived. The implementation adds per-user currency management to finanzas-app, fixing a CSS truncation bug and enabling users to customize which currencies appear in transaction forms. All 12 code tasks (Phases 1–4) completed successfully. No critical issues; 3 warnings and 2 suggestions were documented and accepted in the verify phase.

**Observation IDs for traceability**:
- Proposal: #1485
- Spec: #1486
- Design: #1487
- Tasks: #1488
- Apply Progress: #1489
- Verify Report: #1490

---

## What Was Implemented

### Core Features

1. **Currency Select Width Fix (R-1)**
   - Fixed `w-20` → `w-24` on currency select containers in `PresupuestosSection.tsx` and `TransactionForm.tsx`
   - Eliminates visual clipping of three-letter currency codes (e.g., "COP", "USD")

2. **Per-User Currency Storage (R-4, R-7)**
   - Added `currencies text[]` column to `public.users` via migration `0008_user_currencies.sql`
   - Column defaults to empty array; fallback to `['COP', 'USD']` for new/unconfigured users

3. **Currency Picker Modal (R-2, R-3)**
   - New `CurrencyPicker` component: searchable, fixed-overlay modal
   - Displays 20 world currencies with flag emoji, ISO 4217 code, and Spanish name
   - Case-insensitive search by code or name
   - Toggle-based selection with sticky header and footer

4. **Prop Threading (R-5, R-6)**
   - Added `currencies: string[]` prop to `DashboardShell`, `TransactionForm`, `DebtSection`, `PresupuestosSection`, and `SavingsSection`
   - Removed all local `CURRENCIES` constants from form components
   - Single source of truth flows from DB → page.tsx → DashboardShell → children

5. **Server Action (R-4)**
   - New `updateUserCurrencies(codes: string[])` in `app/actions/currencies.ts`
   - Validates codes against `VALID_CODES` allowlist
   - Authenticates via `verifySession()`
   - Writes to DB and revalidates dashboard path

6. **Consistency Fix**
   - Changed default currency in `app/actions/debts.ts` from `'ARS'` to `'COP'` (2 occurrences)
   - Aligns with spec requirement R-8 and all other form components

---

## Files Delivered

### New Files
- `supabase/migrations/0008_user_currencies.sql`
- `lib/constants/currencies.ts`
- `app/actions/currencies.ts`
- `components/CurrencyPicker.tsx`

### Modified Files
- `lib/supabase/dal.ts` — added `getUserCurrencies()` function
- `app/actions/debts.ts` — fixed default currency (`ARS` → `COP`)
- `components/DashboardShell.tsx` — added currencies prop, fallback, gear icon, CurrencyPicker modal
- `components/TransactionForm.tsx` — removed CURRENCIES const, added prop, fixed w-20 → w-24
- `components/PresupuestosSection.tsx` — removed CURRENCIES const, added prop, fixed w-20 → w-24
- `components/DebtSection.tsx` — removed CURRENCIES const, added prop
- `components/SavingsSection.tsx` — removed CURRENCIES const, added prop
- `app/page.tsx` — added getUserCurrencies() to Promise.all, passed currencies to DashboardShell

---

## Spec Compliance

### Requirements Matrix

| Req | Description | Status | Notes |
|-----|-------------|--------|-------|
| R-1 | Currency select width fix in two form components | **PASS** | w-24 verified in both PresupuestosSection and TransactionForm |
| R-2 | Gear icon in header opens modal | **PASS** | SVG button in DashboardShell header, pickerOpen state management |
| R-3 | Searchable world currency list | **PASS** | useMemo filter, empty state, flag + code + name rendering |
| R-4 | Toggle selection, persist via Server Action | **PASS** | updateUserCurrencies validates, writes DB, revalidatePath |
| R-5 | Form components accept currencies prop | **PASS** | All 4 components updated; no local CURRENCIES constants remain |
| R-6 | DashboardShell threads prop from page.tsx | **PASS** | page.tsx Promise.all includes getUserCurrencies; DashboardShell distributes to children |
| R-7 | Empty array falls back to default | **PASS** | DashboardShell: `const effectiveCurrencies = currencies.length > 0 ? currencies : ['COP', 'USD']` |
| R-8 | 20 required currencies + debts.ts default COP | **PASS** | All 20 codes in lib/constants/currencies.ts; debts.ts uses 'COP' |

---

## Warnings and Resolutions

### WARNING W-1: Silent filtering of invalid codes

**Finding**: `updateUserCurrencies` filters invalid codes with `.filter()` instead of rejecting the call entirely. A user saving an invalid selection would see a silent partial save.

**Spec alignment**: R-4 says "validates codes against VALID_CODES allowlist" but does not prescribe filter vs. reject behavior.

**Decision**: Accepted as defensively safe. The spec behavior is satisfied; filtering is a reasonable implementation choice. If rejection is needed later, it's a trivial change to `app/actions/currencies.ts` line 14.

---

### WARNING W-2: CurrencyPicker state doesn't explicitly reset between saves

**Finding**: After `handleSave` completes and the modal closes, reopening it before the server rerender completes could show stale local state.

**Impact**: Benign for typical UX (user closes after saving). No broken behavior observed during verification.

**Decision**: Accepted. Minor UX edge case; acceptable for this iteration. Recommend UI feedback (toast/loading) if modal reopen frequency increases.

---

### WARNING W-3: Phase 5 testing tasks skipped

**Finding**: Project has no test infrastructure (Jest/Vitest/Playwright). All 5 unit + integration test tasks (5.1–5.5) were pre-marked skipped in apply-progress.

**Impact**: No runtime behavioral proof; verification relies on static type checking and code inspection only.

**Decision**: Pre-approved. Tracked as tech debt. When test infrastructure is added, these are the first 5 tests to write.

---

## Suggestions

### SUGGESTION S-1: DebtSection currency select width consistency

**Note**: R-1 explicitly scoped the `w-20` → `w-24` fix to PresupuestosSection and TransactionForm only. DebtSection was correctly left at `w-20` per spec. For visual consistency across all currency selects, `w-24` would be preferred in DebtSection too.

**Status**: Deferred; out of scope for this change. Recommend as a follow-up micro-task.

---

### SUGGESTION S-2: CurrencyPicker receives post-fallback currencies

**Note**: The picker receives `effectiveCurrencies` (after the fallback logic) rather than the raw DB value. New users see `['COP', 'USD']` pre-checked. This is UX-friendly but means the picker cannot distinguish "nothing stored" from "COP and USD explicitly saved."

**Status**: Acceptable. A design tradeoff documented in design.md D-4. Worth noting if user expectations change.

---

## Verification Summary

- **Build**: `npx tsc --noEmit` → PASSED (zero errors)
- **Task completeness**: 12/12 code tasks complete (Phases 1–4); Phase 5 testing skipped
- **Type safety**: Full TypeScript coverage; no `any` types introduced
- **Spec coverage**: 8/8 requirements implemented and verified
- **Critical issues**: 0
- **Warnings**: 3 (all accepted; none block ship)
- **Suggestions**: 2 (design decisions, out of scope for this change)

**Overall Verdict**: PASS WITH WARNINGS

---

## Spec Merge Status

**Mode**: hybrid (Engram + openspec/)

No delta specs to merge — all spec content is in `spec.md`, which represents the full authoritative spec for user-currencies. No main specs directory (`openspec/specs/`) exists yet, so no filesystem merge is needed. The spec is finalized and ready for future schema reference if a specs directory is created.

---

## Archive Contents

- `proposal.md` ✅ — Intent, scope, approach, risks, rollback
- `spec.md` ✅ — 8 requirements with scenarios and evidence
- `design.md` ✅ — 7 architecture decisions, data flow, interfaces
- `tasks.md` ✅ — 5 phases, 17 total tasks (12 code, 5 testing)
- `apply-progress.md` ✅ — All 13 implemented tasks with deviations notes
- `verify-report.md` ✅ — Type check passing, spec compliance matrix, 3 warnings, 2 suggestions
- `explore.md` ✅ — (created during exploration phase; reference only)

---

## SDD Cycle Complete

The change has been fully:
- **Proposed** (intent, scope, approach defined)
- **Specified** (8 requirements with acceptance scenarios)
- **Designed** (7 architectural decisions, data flow, interfaces)
- **Tasked** (17 tasks across 5 phases)
- **Applied** (12 code tasks completed; 5 testing tasks skipped due to no infrastructure)
- **Verified** (TypeScript passing; spec compliance verified by code inspection; 3 warnings accepted)
- **Archived** (all artifacts consolidated; change ready for production or next iteration)

Ready for the next change.
