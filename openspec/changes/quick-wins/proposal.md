# Proposal: quick-wins

## Intent

Add 6 UX improvements to the finanzas-app dashboard that are entirely client-side: no database schema changes, no new server actions, and no new files. All changes land in existing component files.

## Architecture

Pure client-side. The server-action layer (`app/actions/`) is already correct and remains untouched. Changes are confined to React component state and prop interfaces.

## Scope

| File | Nature of change |
|------|-----------------|
| `components/DashboardShell.tsx` | Logout button, isPending wired, currencyGroups computed |
| `components/SummaryCards.tsx` | Prop interface broken → grouped, one row per currency |
| `components/TransactionTable.tsx` | Search input, CSV export, pagination, isPending prop |
| `components/DebtSection.tsx` | isPending prop accepted and applied to action buttons |

No new files. No schema changes. No new server actions.

## Features

1. **Logout button** — `<form action={logout}>` in DashboardShell header
2. **Loading feedback** — wire `isPending` from existing `useTransition`, pass to child components
3. **Search by description** — client-side filter on the `filtered` memo in TransactionTable
4. **Export CSV** — download filtered transactions as UTF-8 BOM CSV (Excel compatible)
5. **Multi-currency summary** — SummaryCards renders one row per currency instead of mixing
6. **Pagination** — 10 rows/page in TransactionTable with prev/next controls + "ver todo" toggle

## Delivery

Estimated ~180 changed lines. Single PR is within review budget. No chained PRs needed.
