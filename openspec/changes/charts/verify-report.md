# Verify Report — charts
**Date**: 2026-09-07
**Overall**: PASSED

| Req | Status | Evidence |
|-----|--------|----------|
| R-1 | PASS | `DashboardShell.tsx` line 24: `type Tab = 'transactions' \| 'debts' \| 'charts'`; tab button "Graficos" at lines 185–194; `ChartsSection` panel at line 214 |
| R-2 | PASS | `MonthlyTrendChart.tsx`: recharts `BarChart` with two `Bar` (income/expense); `groupByMonth` filters by currency, sorts ascending YYYY-MM key, slices last 12 |
| R-3 | PASS | `DistributionChart.tsx`: `PieChart` innerRadius=60 outerRadius=90 (donut); two `Cell`; `getTotals` provides totals per currency |
| R-4 | PASS | `ChartsSection.tsx`: `getCSSVar('--color-income')` / `getCSSVar('--color-expense')` via `getComputedStyle`; safe fallback when `window` undefined |
| R-5 | WARNING | Empty state fires on `data.length < 1`, not `< 2` per spec — single-month case shows chart instead of message |
| R-6 | PASS | `useState(false)` + `useEffect(() => setMounted(true), [])` guard; skeleton shown until mounted |
| R-7 | PASS | Currency selector rendered only when `currencies.length > 1`; defaults to first available or 'COP' |

## Issues

### CRITICAL
None.

### WARNING

**W-1 (R-5) — Empty-state threshold mismatch**
- Spec: "fewer than 2 months" → `data.length < 2`
- Implementation: `data.length < 1` (`components/charts/MonthlyTrendChart.tsx`, line 20)
- Impact: with exactly 1 month of data the bar chart renders with a single bar instead of the empty-state message.
- Fix: change `< 1` to `< 2` on that line.

### SUGGESTION

**S-1 (R-2) — Month label locale consistency**
`toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })` may produce trailing periods (e.g. "sep.") that vary by OS/runtime. Low risk but worth noting for cross-platform consistency.

**S-2 (R-3) — No Legend on DistributionChart**
Intentional deviation from design spec. Slices are labelled via the `label` prop, but no `<Legend />` is rendered. Consider adding for accessibility.

**S-3 (R-7) — selectedCurrency stale after prop change**
`selectedCurrency` is initialised once from `currencies[0]`. If transactions change and that currency disappears, state goes stale. Low risk with current SSR + Server Actions architecture.

## TypeScript
PASS — `npx tsc --noEmit` completed with zero errors.

## Task Completion
All 6/6 tasks marked complete in apply-progress. Code state matches claimed completions across all files.
