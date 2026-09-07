# Proposal: Charts — Visual Analytics Tab

## Intent

Add visual analytics to finanzas-app via a new "Gráficos" tab. Users need feedback on spending patterns beyond the raw transaction list. All required data is already available client-side in the existing `transactions[]` prop — no new server calls are needed.

## Library Decision

**recharts@^2** (pin to v2 — v3 is RC as of 2025).

| Library | Tailwind v4 compat | SSR safe | Bundle (gzip) | Verdict |
|---|---|---|---|---|
| recharts | Yes — color props accept CSS vars/hex | Yes | ~60 KB | **Selected** |
| chart.js + react-chartjs-2 | Manual color resolution only | No (needs dynamic import ssr:false) | ~75 KB | Rejected |
| tremor | Broken on Tailwind v4 | Yes | ~45 KB | Rejected |

Key reason: recharts color props accept CSS var values directly as hex (read via `getComputedStyle`), SSR-safe without dynamic import tricks, pure JSX API, React 19 compatible.

## Placement

Third tab **"Graficos"** in `DashboardShell`, alongside "Registros" and "Deudas".

- Matches existing tab pattern exactly
- Zero layout disruption
- Lazy render — charts only mount when tab is active (avoids render cost on load)
- `DashboardShell` changes minimal: add `'charts'` to `Tab` union + one tab button + one panel

## Data Strategy

Client-side aggregation via a pure `groupByMonth(transactions, currency)` function in `lib/aggregations.ts`. Pattern is already proven — `TransactionTable` does equivalent grouping inline. Extract and reuse. O(n), synchronous, no server round-trip.

## Charts

1. **Monthly trend** — `BarChart` with grouped bars (income green / expense red) per month, last 12 months
2. **Distribution** — `PieChart` donut showing income vs expense as % of total cash flow

## Colors

CSS vars already defined for both themes:
- `--color-income`: light `#059669` / dark `#10b981`
- `--color-expense`: light `#e11d48` / dark `#f43f5e`
- `--color-primary`: light `#0284c7` / dark `#0ea5e9`

Read via `getComputedStyle(document.documentElement).getPropertyValue(name).trim()` — client-only, called after mount.
