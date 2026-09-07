# Design: Theme System (Dark / Light)

## Technical Approach

Install `next-themes`, wire a `Providers.tsx` client wrapper in `app/layout.tsx`, define light/dark semantic tokens as raw-hex CSS custom properties in `globals.css`, and migrate every component from hardcoded dark-only classes to dual `base / dark:` class pairs. Dynamic class composition in `SummaryCards` and `AmountInput` is restructured into full static string literals to survive Tailwind's purge.

---

## Architecture Decisions

### ADR-1: ThemeProvider placement

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `app/layout.tsx` directly | Layout is a Server Component — `useTheme` fails | Rejected |
| `components/Providers.tsx` (`'use client'`) | Thin wrapper, clean boundary | **Chosen** |

`Providers.tsx` renders `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`. `layout.tsx` wraps body children with `<Providers>` and adds `suppressHydrationWarning` to `<html>` to silence React's class-mismatch warning (next-themes injects the class before hydration; the mismatch is intentional and harmless).

### ADR-2: CSS token strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `theme()` function inside `:root` / `.dark` | Tailwind v4 `@theme inline` does NOT resolve `theme()` inside arbitrary CSS rules — produces empty values | Rejected |
| Raw hex values in `:root` / `.dark` | Verbose but reliable; works everywhere | **Chosen** |
| CSS `color-mix()` | Modern, but not needed — we have two fixed palettes | Rejected |

Define semantic tokens under `:root` (light defaults) and `.dark` (dark overrides) using raw hex. Keep `@theme inline` only for font and existing color aliases — do NOT move semantic tokens into `@theme inline` (those are for Tailwind utility generation, not for runtime theming).

Strategy for components: use direct Tailwind utility classes with `dark:` prefix rather than building new custom utility aliases from the CSS vars. This avoids Tailwind v4 CSS-var-to-utility mapping edge cases.

### ADR-3: Class migration rule (dark-only → dual-theme)

Current classes are dark-optimized. The migration pattern: the CURRENT class becomes the light-mode default; add a `dark:` counterpart to restore the dark appearance.

| Current (dark-only) | Light default | Dark counterpart |
|---------------------|---------------|------------------|
| `bg-zinc-950` | `bg-zinc-100` | `dark:bg-zinc-950` |
| `bg-zinc-900` | `bg-white` | `dark:bg-zinc-900` |
| `bg-zinc-800` | `bg-zinc-100` | `dark:bg-zinc-800` |
| `border-zinc-800` | `border-zinc-200` | `dark:border-zinc-800` |
| `border-zinc-700` | `border-zinc-300` | `dark:border-zinc-700` |
| `text-white` | `text-zinc-950` | `dark:text-white` |
| `text-zinc-400` | `text-zinc-600` | `dark:text-zinc-400` |
| `text-zinc-500` | `text-zinc-500` | (same — muted is invariant) |
| `text-zinc-600` | `text-zinc-800` | `dark:text-zinc-600` |
| `emerald-500` income | `emerald-600` | `dark:emerald-500` |
| `rose-500` expense | `rose-600` | `dark:rose-500` |
| `sky-500` primary | `sky-600` | `dark:sky-500` |
| `amber-500` debt | `amber-600` | `dark:amber-500` |

Special cases observed in the codebase:
- `SummaryCards`: tinted card backgrounds (`emerald-950/30`, `rose-950/30`, `sky-950/30`, `amber-950/30`) — light mode uses lighter tints (`emerald-50`, `rose-50`, `sky-50`, `amber-50`) with corresponding border colors.
- `bg-zinc-900/80` (header backdrop) → `bg-white/80 dark:bg-zinc-900/80`.
- `bg-black/60` (modal overlays) — functionally acceptable in both themes; keep as-is.

### ADR-4: Dynamic class safety

**SummaryCards.tsx** — balance ternary must use complete static strings per branch:

```tsx
// CORRECT — full strings, Tailwind can statically analyze
balance >= 0
  ? 'border-sky-300 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-950/30'
  : 'border-amber-300 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/30'
```

Template literals or string concatenation at runtime → classes purged in production.

**AmountInput.tsx** — accent lookup object must contain full strings per key:

```tsx
const FOCUS: Record<NonNullable<Props['accent']>, string> = {
  sky:   'focus-within:border-sky-600 dark:focus-within:border-sky-500',
  amber: 'focus-within:border-amber-600 dark:focus-within:border-amber-500',
}
```

### ADR-5: ThemeToggle component

- `'use client'` component with `mounted` guard (`useState(false)` + `useEffect(() => setMounted(true), [])`). Returns `<div className="h-9 w-9" />` placeholder until mounted — prevents layout shift and SSR mismatch.
- Inline SVG sun/moon icons — no icon-lib dependency. Consistent with existing pattern: `LoginForm.tsx` uses inline `EyeIcon`, `AmountInput.tsx` uses inline arrow SVGs.
- Placement: inside `DashboardShell` header `<div className="flex ... gap-2">` alongside the Ingreso/Egreso buttons, on the right side before those buttons.
- `aria-label` is required for keyboard navigation (success criterion from proposal).

### ADR-6: Login page and auth bar in layout.tsx

`LoginForm.tsx` — add `dark:` counterparts for all zinc/sky/red classes. No `ThemeToggle` rendered here — spec requires toggle only on authenticated dashboard. OS preference governs login page automatically via `defaultTheme="system"`.

`app/layout.tsx` auth bar (email + logout) — currently hardcoded `bg-zinc-900`, `border-zinc-800/60`, `text-zinc-500`, `hover:bg-zinc-800`. Must gain light-mode counterparts following the migration table above.

---

## Data Flow

```
OS media query / localStorage
        │
        ▼
  next-themes ThemeProvider  (Providers.tsx, 'use client')
        │  sets class="dark" | "light" on <html>
        │
        ▼
  Tailwind dark: variants  ──→  rendered CSS applied to every component
        │
        ▼
  ThemeToggle.useTheme()  ──→  reads + writes theme via ThemeProvider context
```

No server-side theme state. Resolution is entirely client-side after hydration. `suppressHydrationWarning` on `<html>` absorbs the intentional class mismatch during SSR.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `next-themes` dependency |
| `app/layout.tsx` | Modify | Add `suppressHydrationWarning` to `<html>`, remove hardcoded `dark` class, wrap body children with `<Providers>`, add `dark:` pairs to auth bar classes |
| `app/globals.css` | Modify | Add `:root` light tokens and `.dark` dark tokens as raw hex; update `body` to use semantic vars |
| `components/Providers.tsx` | Create | `'use client'` wrapper hosting `ThemeProvider` |
| `components/ThemeToggle.tsx` | Create | Sun/moon button with mounted guard and inline SVGs |
| `components/DashboardShell.tsx` | Modify | Import + render `ThemeToggle` in header; migrate ~25 color classes to dual-theme pairs |
| `components/SummaryCards.tsx` | Modify | Fix dynamic ternary strings to include full light + dark variants; migrate tinted card backgrounds |
| `components/AmountInput.tsx` | Modify | Expand `FOCUS` lookup to include `dark:` variants; migrate container/input classes |
| `components/TransactionForm.tsx` | Modify | Migrate modal overlay, inputs, select, buttons to dual-theme |
| `components/DebtSection.tsx` | Modify | Migrate debt cards, modal, buttons to dual-theme |
| `components/TransactionTable.tsx` | Modify | Migrate table rows, filter controls, delete confirmation dialog |
| `components/LoginForm.tsx` | Modify | Migrate form inputs, toggle tabs, submit button to dual-theme |
| `components/PWAInstallBanner.tsx` | Modify | Migrate banner background, border, text to dual-theme |

Total: 2 new files, 11 modified files.

---

## Interfaces / Contracts

```tsx
// components/Providers.tsx
'use client'
import { ThemeProvider } from 'next-themes'
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  )
}

// components/ThemeToggle.tsx — signature
export function ThemeToggle(): JSX.Element
// No props. Reads/writes theme via useTheme(). Renders placeholder until mounted.
```

CSS tokens (raw hex, verified against Tailwind zinc/emerald/rose/sky/amber scales):

```css
:root {
  --bg: #f4f4f5;           /* zinc-100 */
  --surface: #ffffff;
  --surface-raised: #f4f4f5;
  --border: #d4d4d8;       /* zinc-300 */
  --border-subtle: #e4e4e7; /* zinc-200 */
  --text-primary: #09090b;  /* zinc-950 */
  --text-secondary: #52525b; /* zinc-600 */
  --text-muted: #71717a;   /* zinc-500 */
  --accent-income: #059669;  /* emerald-600 */
  --accent-expense: #e11d48; /* rose-600 */
  --accent-primary: #0284c7; /* sky-600 */
  --accent-debt: #d97706;   /* amber-600 */
}
.dark {
  --bg: #09090b;
  --surface: #18181b;
  --surface-raised: #27272a;
  --border: #3f3f46;
  --border-subtle: #27272a;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --accent-income: #10b981;
  --accent-expense: #f43f5e;
  --accent-primary: #0ea5e9;
  --accent-debt: #f59e0b;
}
```

Note: tokens inform scrollbar and body styles only. Component classes use Tailwind utilities with `dark:` prefix, NOT `var(--accent-income)` etc. This keeps Tailwind's static analysis working and avoids custom utility mapping overhead in v4.

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `ThemeToggle` renders placeholder before mount, toggles theme on click | React Testing Library, mock `useTheme` |
| Unit | `Providers` renders children wrapped in ThemeProvider | RTL, verify context provided |
| Visual / manual | All components in light + dark mode | Chrome DevTools color scheme override |
| Build | No dynamic class purge | `next build` + inspect generated CSS for `emerald-50`, `sky-50`, `border-sky-300` |
| Manual | OS preference detected on first visit (no flash) | Incognito + DevTools forced dark/light |
| Manual | Toggle persists across reload | localStorage `theme` key inspection |
| A11y | ThemeToggle keyboard nav, `aria-label` present | Axe / browser tab focus |

---

## Migration / Rollout

No data migration. No feature flag needed — purely presentational and fully reversible.

Rollback: `npm uninstall next-themes`, remove `<Providers>` from layout, restore `dark` class on `<html>`, revert component files via git. CSS token additions in `globals.css` are additive; dark theme continues to function with a hardcoded `dark` class.

---

## Open Questions

- [ ] Confirm `next-themes` version compatibility with Next.js 16 / React 19 before install (`npm info next-themes peerDependencies`).
- [ ] Scrollbar colors (currently hardcoded `#3f3f46` / `#52525b`) — adapt to light theme or leave dark-only? Not blocking.
- [ ] ThemeToggle position on mobile: end of Ingreso/Egreso row (current design) vs. floating icon. Current design keeps it simple; revisit if cramped on small viewports.
