# Tasks: Theme System (Dark / Light)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~347 (additions + deletions) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR — within 400-line budget |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full theme system | PR 1 | Sequential — all tasks in one PR |

---

## Phase 1: Infrastructure

- [ ] 1.1 `package.json` — run `npm install next-themes`; verify peer deps against Next.js 16 / React 19. (~5 lines)
  - Dependency: none
- [ ] 1.2 `app/globals.css` — add `:root` block with light hex tokens and `.dark` block with dark hex tokens (from spec Color Token Reference); keep `@theme inline` and scrollbar rules intact. (+20 lines)
  - Dependency: none
- [ ] 1.3 `components/Providers.tsx` — CREATE: `'use client'` wrapper exporting `Providers` that renders `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`. (+12 lines)
  - Dependency: 1.1
- [ ] 1.4 `components/ThemeToggle.tsx` — CREATE: `'use client'`, `mounted` guard returning `<div className="h-9 w-9" />` pre-hydration, sun/moon inline SVGs (16×16), `aria-label` per spec, dual-theme button classes. (+45 lines)
  - Dependency: 1.1

## Phase 2: Layout & Shell Wiring

- [ ] 2.1 `app/layout.tsx` — remove hardcoded `dark` class from `<html>`; add `suppressHydrationWarning` to `<html>`; wrap `{children}` (and auth bar) with `<Providers>`; migrate auth bar classes to dual-theme (`bg-white dark:bg-zinc-900`, etc.). (~15 changed lines)
  - Dependency: 1.3
- [ ] 2.2 `components/DashboardShell.tsx` — import and add `<ThemeToggle>` to header flex row (before the Ingreso/Egreso buttons); migrate all ~25 color class occurrences using the substitution table; tab active state uses `bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-white`; error toast uses `dark:` prefixed colors. (~30 changed lines)
  - Dependency: 1.4, 2.1

## Phase 3: Component Migration

- [ ] 3.1 `components/SummaryCards.tsx` — replace dynamic ternary strings with full static literals per ADR-4: income card `border-emerald-300 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/30`; expense card `border-rose-300 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-950/30`; balance ternary branches become full literal strings with both light and `dark:` classes. (~20 changed lines)
  - Dependency: 2.1
- [ ] 3.2 `components/TransactionTable.tsx` — migrate filter selects, table header, rows (`bg-transparent dark:bg-zinc-900/40`), mobile cards, footer, and delete modal using substitution table; no dynamic class construction. (~40 changed lines)
  - Dependency: 2.1
- [ ] 3.3 `components/DebtSection.tsx` — migrate section header, empty-state border, debt card (`border-amber-300 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20`), edit/delete buttons, form modal, and delete confirmation modal. (~30 changed lines)
  - Dependency: 2.1
- [ ] 3.4 `components/TransactionForm.tsx` — migrate modal overlay (`bg-black/50 dark:bg-black/60`), modal card, labels, inputs, select, cancel/submit buttons; submit ternary (income/expense) keeps full literal branches with `dark:` hover variants. (~25 changed lines)
  - Dependency: 2.1
- [ ] 3.5 `components/LoginForm.tsx` — migrate mode toggle container, active/inactive tab states, inputs (`bg-white dark:bg-zinc-800/50`), error banner, eye-icon button, submit button; no toggle button rendered here (spec: toggle only on dashboard). (~20 changed lines)
  - Dependency: 2.1
- [ ] 3.6 `components/AmountInput.tsx` — expand `FOCUS` lookup to full static strings per ADR-4: `sky: 'focus-within:border-sky-600 dark:focus-within:border-sky-500'`, `amber: 'focus-within:border-amber-600 dark:focus-within:border-amber-500'`; migrate container (`bg-white dark:bg-zinc-800`), dividers, and stepper buttons. (~15 changed lines)
  - Dependency: 2.1
- [ ] 3.7 `components/PWAInstallBanner.tsx` — migrate banner container (`bg-white/95 dark:bg-zinc-900/95`), border, text colors, install button, and close button. (~10 changed lines)
  - Dependency: 2.1

## Phase 4: Testing

- [ ] 4.1 `components/__tests__/ThemeToggle.test.tsx` — RED: write failing tests for (a) placeholder rendered before mount, (b) correct icon after mount matches active theme, (c) `setTheme` called on click. Use RTL + `vi.mock('next-themes')`.
  - Dependency: 1.4
- [ ] 4.2 `components/__tests__/ThemeToggle.test.tsx` — GREEN: confirm tests pass against the implemented component. No source changes allowed — fix tests only if assertions were wrong.
  - Dependency: 4.1
- [ ] 4.3 `components/__tests__/Providers.test.tsx` — RED then GREEN: verify `Providers` renders children inside `ThemeProvider` context; assert `attribute="class"` and `defaultTheme="system"` props.
  - Dependency: 1.3
- [ ] 4.4 Build verification — run `next build`; confirm no purged class warnings and no TS errors. Manual: toggle OS color scheme via DevTools, verify no FOUC on reload.
  - Dependency: 3.1–3.7

## Phase 5: Cleanup

- [ ] 5.1 `app/globals.css` — review scrollbar colors (#3f3f46 / #52525b); if keeping dark-only scrollbar is acceptable for v1, document with a `/* TODO: light-mode scrollbar */` comment. (~2 lines)
  - Dependency: 1.2
- [ ] 5.2 Audit any remaining `bg-zinc-950`, `bg-zinc-900`, `bg-zinc-800`, `border-zinc-700`, `border-zinc-800`, `text-white`, `text-zinc-400`, `text-zinc-300` occurrences without `dark:` prefix via `rg` across `components/` and `app/` — must be zero hits outside of `dark:` contexts.
  - Dependency: 3.1–3.7
