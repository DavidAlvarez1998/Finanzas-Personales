# Spec: Charts — Requirements

## Requirements

### R-1 — New tab
A "Graficos" tab appears in the `DashboardShell` tab bar alongside "Registros" and "Deudas". Selecting it renders the `ChartsSection` component.

### R-2 — Monthly trend bar chart
A grouped bar chart shows **income** (green) and **expense** (red) bars per month for the last 12 months (or all available months if fewer than 12 exist), sorted ascending left-to-right. X-axis labels show month abbreviations.

### R-3 — Income vs expense distribution
A donut chart shows total income vs total expense as percentages of combined cash flow (`totalIncome + totalExpense`). Each segment is labeled with the percentage.

### R-4 — Theme-adaptive colors
Chart colors adapt automatically to dark/light theme via CSS vars read at runtime:
- Income: `--color-income`
- Expense: `--color-expense`

No hardcoded hex values in source — always read from `getComputedStyle`.

### R-5 — Empty state for trend chart
If fewer than 2 months of data exist for the selected currency, the trend chart renders an empty state message (e.g., "No hay suficientes datos para mostrar la tendencia") instead of an empty or broken chart.

### R-6 — Client-only rendering
Charts are only rendered client-side. A `useEffect`-based mount guard prevents SSR hydration mismatch. Before mount, a skeleton placeholder (`animate-pulse` div, `h-64`) is shown.

### R-7 — Currency filter
Charts display **COP** data by default. If `transactions` contains multiple distinct currency values, a `<select>` dropdown appears above the charts allowing the user to switch currency. The charts re-aggregate reactively when the selected currency changes.

## Out of Scope

- Category breakdown charts (no `category` field on `Transaction`)
- Server-side data fetching for charts
- Real-time / auto-refresh
- Export to image or PDF
