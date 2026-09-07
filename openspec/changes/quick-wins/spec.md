# Spec: quick-wins

## Requirements

### R-1 — Logout button
- A logout button MUST be visible in the DashboardShell header at all times.
- Clicking it MUST call the `logout` server action (`app/actions/auth.ts`) which destroys the session and redirects to `/login`.
- Implementation MUST use a `<form action={logout}>` element so it works without JavaScript.
- The button label is "Salir" or an icon-only variant with accessible `aria-label="Cerrar sesión"`.

### R-2 — Loading feedback (isPending)
- All interactive buttons (add transaction, delete transaction, add debt, update debt, delete debt, logout) MUST be `disabled` while any server action transition is pending.
- Disabled buttons MUST have `opacity-50` and `cursor-not-allowed` applied so the visual state is clear.
- `isPending` comes from a single `useTransition` in DashboardShell and is passed as a prop to TransactionTable and DebtSection.
- No spinner is required; opacity change is sufficient.

### R-3 — Search by description
- TransactionTable MUST expose a text input labeled "Buscar por descripción" (placeholder) in the filter bar.
- Filtering is case-insensitive and matches anywhere in the `description` field.
- Both sides of the comparison MUST be lowercased before matching because descriptions are stored uppercase.
- The search filter is applied AFTER the month/year filter (i.e., it narrows the already-filtered set).
- An empty search string shows all records (no filtering by description).

### R-4 — Export CSV
- TransactionTable MUST expose an "Exportar CSV" button in the filter bar.
- Clicking it downloads the currently-filtered transaction set (after month, year, and search filters) as a `.csv` file.
- The file MUST include a UTF-8 BOM (`﻿`) for Excel compatibility.
- Columns (in order): `Fecha`, `Descripción`, `Ingresos`, `Egresos`, `Moneda`.
- Filename format: `registros-YYYY-MM.csv` (using the selected filterYear and filterMonth, zero-padded).
- The download MUST release the object URL via `URL.revokeObjectURL` to avoid memory leaks.

### R-5 — Multi-currency summary
- SummaryCards MUST accept a `groups` prop of type `Array<{ currency: string; income: number; expense: number; balance: number }>`.
- It MUST render one summary row per currency entry in `groups`.
- The old flat-number prop interface (`totalIncome`, `totalExpense`, `balance`) is removed.
- DashboardShell MUST compute `groups` from `transactions` by grouping on `t.currency ?? 'COP'`.
- Transactions without a `currency` field MUST be treated as `'COP'`.
- Each group's `balance = income - expense`.

### R-6 — Pagination
- TransactionTable MUST show at most 10 rows per page by default.
- Pagination controls (Previous / Next) appear below the table when there is more than one page.
- A "Ver todo" toggle switches to showing all filtered records with no page limit.
- Activating "Ver todo" hides the pagination controls.
- Changing filterMonth, filterYear, or searchQuery MUST reset the current page to 0.
- Footer totals (`monthIncome`, `monthExpense`) MUST be computed from the full `filtered` array, NOT from the paginated slice.
