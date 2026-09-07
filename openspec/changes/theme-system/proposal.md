# Proposal: Theme System (Dark / Light)

## Intent

The app is permanently dark-mode via a hardcoded `dark` class on `<html>`. Users have no way to switch to a light theme or respect their OS preference. This causes friction for users who prefer light interfaces or switch modes during the day. The fix delivers a proper dual-theme system with OS detection, persistent user toggle, and zero flash on load.

## Scope

### In Scope
- Install `next-themes` for SSR-safe theme management
- Define complete dark and light semantic token palettes in `globals.css` via `@theme inline` / CSS custom properties
- Create `components/Providers.tsx` (client wrapper for `ThemeProvider`)
- Create `components/ThemeToggle.tsx` (sun/moon icon button with mounted guard)
- Migrate all 8 components from hardcoded dark tokens to `dark:` Tailwind variants
- Fix dynamic class composition in `SummaryCards.tsx` and `AmountInput.tsx` to use full string literals
- Place toggle in `DashboardShell` header

### Out of Scope
- Third theme (e.g. high-contrast, sepia)
- Per-component color overrides or custom user palettes
- Theme-aware charts or data visualizations (deferred)
- Design system / Storybook documentation

## Capabilities

### New Capabilities
- `theme-system`: User-togglable dark/light theme with OS detection, localStorage persistence, and SSR hydration safety

### Modified Capabilities
None — existing UI components change implementation only; their functional requirements are unchanged.

## Approach

1. **Install** `next-themes` — handles SSR flash prevention, localStorage, and OS media query automatically.
2. **CSS tokens** — define two sets of CSS custom properties (one per theme) under `[data-theme="dark"]` and `[data-theme="light"]` (or `:root` + `[data-theme="light"]` inversion) inside `globals.css`. Tailwind v4 reads them via `@theme inline`.
3. **Provider wiring** — `Providers.tsx` wraps `ThemeProvider` with `attribute="class"` (Tailwind `dark:` variant pattern) and `defaultTheme="system"`. `layout.tsx` wraps `<body>` children with `<Providers>`; `<html>` gets `suppressHydrationWarning`.
4. **Toggle** — `ThemeToggle.tsx` uses `useTheme()` + a `mounted` guard (renders `null` until client hydration completes) to avoid SSR mismatch.
5. **Component migration** — replace every hardcoded dark token with a semantic pair: `bg-surface dark:bg-surface` pattern, or remove the `dark:` prefix entirely if the token already points to a CSS var that flips. All 116 occurrences across 8 files are updated.
6. **Dynamic class fix** — `SummaryCards.tsx` and `AmountInput.tsx` restructured so Tailwind class strings are never assembled from partial tokens at runtime.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/layout.tsx` | Modified | Add `suppressHydrationWarning` to `<html>`, wrap body with `<Providers>` |
| `app/globals.css` | Modified | Add full light + dark semantic token sets via CSS custom properties |
| `components/Providers.tsx` | New | Client component hosting `ThemeProvider` |
| `components/ThemeToggle.tsx` | New | Sun/moon toggle button with mounted guard |
| `components/DashboardShell.tsx` | Modified | Import `ThemeToggle`, update ~25 hardcoded color classes |
| `components/TransactionTable.tsx` | Modified | Migrate hardcoded color classes |
| `components/DebtSection.tsx` | Modified | Migrate hardcoded color classes |
| `components/SummaryCards.tsx` | Modified | Fix dynamic ternary classes + migrate tokens |
| `components/LoginForm.tsx` | Modified | Migrate hardcoded color classes |
| `components/TransactionForm.tsx` | Modified | Migrate hardcoded color classes |
| `components/AmountInput.tsx` | Modified | Fix accent lookup object + migrate tokens |
| `components/PWAInstallBanner.tsx` | Modified | Migrate hardcoded color classes |
| `package.json` | Modified | Add `next-themes` dependency |

## Color Palette

### Dark Theme (refined zinc base)
| Token | Value | Tailwind Reference |
|-------|-------|--------------------|
| Background | `#09090b` | zinc-950 |
| Surface | `#18181b` | zinc-900 |
| Surface raised | `#27272a` | zinc-800 |
| Border | `#3f3f46` | zinc-700 |
| Border subtle | `#27272a` | zinc-800 |
| Text primary | `#fafafa` | zinc-50 |
| Text secondary | `#a1a1aa` | zinc-400 |
| Text muted | `#71717a` | zinc-500 |
| Accent income | `#10b981` | emerald-500 |
| Accent expense | `#f43f5e` | rose-500 |
| Accent primary | `#0ea5e9` | sky-500 |
| Accent debt | `#f59e0b` | amber-500 |

### Light Theme (clean fintech)
| Token | Value | Tailwind Reference |
|-------|-------|--------------------|
| Background | `#f4f4f5` | zinc-100 |
| Surface | `#ffffff` | white |
| Surface raised | `#f4f4f5` | zinc-100 |
| Border | `#d4d4d8` | zinc-300 |
| Border subtle | `#e4e4e7` | zinc-200 |
| Text primary | `#09090b` | zinc-950 |
| Text secondary | `#52525b` | zinc-600 |
| Text muted | `#71717a` | zinc-500 |
| Accent income | `#059669` | emerald-600 |
| Accent expense | `#e11d48` | rose-600 |
| Accent primary | `#0284c7` | sky-600 |
| Accent debt | `#d97706` | amber-600 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dynamic class purging — Tailwind drops classes composed at runtime | High | Restructure `SummaryCards.tsx` and `AmountInput.tsx` to full static string literals before migration |
| SSR hydration mismatch on theme toggle | Med | `suppressHydrationWarning` on `<html>` + mounted guard in `ThemeToggle` |
| Missed hardcoded class (one of the 116) in migration | Med | Grep for raw zinc/slate/gray color classes post-migration as a checklist |
| `next-themes` version incompatibility with Next.js 16 | Low | Verify peer deps on install; fallback is manual CSS class toggle via context |

## Rollback Plan

1. `npm uninstall next-themes`
2. Remove `<Providers>` from `layout.tsx`, restore `dark` class on `<html>`
3. Revert all 8 component files via `git revert` or `git checkout HEAD~N -- <file>`
4. The CSS token changes in `globals.css` are additive — dark theme still functions if `dark` class is hardcoded

## Dependencies

- `next-themes` (npm install)

## Success Criteria

- [ ] Light theme renders correctly across all 8 components — no invisible text, no contrast failures
- [ ] Dark theme is visually identical (or improved) compared to current state
- [ ] OS preference is detected on first visit (no flash of wrong theme)
- [ ] User toggle persists across page reloads via localStorage
- [ ] No React hydration warnings in browser console
- [ ] Tailwind purge does not drop any dynamic color classes (verify in production build)
- [ ] `ThemeToggle` is accessible (keyboard navigable, has `aria-label`)
