# Proposal: Responsive UI

## Intent

The finanzas-app is functionally desktop-only. Only 2 `sm:` breakpoint usages exist across the entire codebase, and the most-used view (TransactionTable) forces horizontal scroll on phones. Users on mobile (320–639px) and tablet (640–1023px) cannot read the ledger, action buttons collide, and delete modals bleed edge-to-edge on 320px devices. Personal finance apps are consulted on-the-go — this must work on a phone.

Also bundled: `TransactionForm` declares `date` state but never renders a `<input type="date">`. Fixing responsive-form layout is the natural moment to add the missing field.

## Scope

### In Scope
- Mobile-first layout for `TransactionTable` (card-per-row on mobile, table on `sm+`)
- Header layout fix in `DashboardShell` (stack title + CTA on mobile)
- Wrap-safe layout for `DebtSection` list rows
- Safe-margin fix for delete modals in `TransactionTable` and `DebtSection` (`w-80` → `w-full max-w-xs mx-4`)
- Modal wrapper padding for `TransactionForm` (`px-4` on outer wrapper)
- Auth-bar email truncation in `app/layout.tsx`
- Bundled bug: render missing `<input type="date">` in `TransactionForm`

### Out of Scope
- Custom breakpoints or `tailwind.config.ts` (Tailwind v4 config-less setup preserved)
- Mobile navigation (hamburger, bottom nav, drawer) — not needed for current single-column layout
- CSS container queries (Option C) — overkill for current component set
- Light-mode / theming changes
- Any new dependencies or headless UI libraries
- Redesign of visual language, colors, typography scale

## Capabilities

### New Capabilities
- `responsive-layout`: viewport-adaptive rendering rules for the ledger, header, debt list, and modal surfaces across mobile (320–639px), tablet (640–1023px), and desktop (1024px+)

### Modified Capabilities
None — no existing capabilities in `openspec/specs/`.

## Approach

Option A from exploration: targeted mobile-first Tailwind v4 breakpoint classes. No new deps, no config changes, no new components (except a mobile card sub-tree inside `TransactionTable`). Standard `hidden sm:block` / `block sm:hidden` duplication for table/card swap. Both representations must render from the same filtered data so totals and filters stay in sync.

Rationale: app is simple, single-column, no sidebars — container queries and drawer patterns add complexity without meaningful UX gain here.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `components/TransactionTable.tsx` | Modified | Add mobile card list; keep desktop table; fix delete-modal width; ensure filter/total shared |
| `components/DashboardShell.tsx` | Modified | Header `flex-col gap-3 sm:flex-row`; ensure CTA reachable on 320px |
| `components/DebtSection.tsx` | Modified | Row `flex-col sm:flex-row`; delete-modal width fix |
| `components/TransactionForm.tsx` | Modified | Outer wrapper `px-4`; render missing `<input type="date">` |
| `app/layout.tsx` | Modified | Auth-bar email `truncate max-w-[180px]` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Table/card markup drift when columns change | Med | Extract a `<TransactionRowData>` helper or shared render function so both views map the same fields |
| Filter + total footer must apply to both mobile and desktop views | Med | Keep filter bar and totals OUTSIDE the responsive swap; only the row rendering swaps |
| Adding `<input type="date">` may shift form validation behavior | Low | Bug is scoped: date state already exists; only wire the input, keep submit contract unchanged |
| Tailwind v4 default breakpoints (sm:640, md:768, lg:1024) may not match "tablet" perfectly | Low | Use `sm:` for mobile→tablet swap and `lg:` for tablet→desktop where it matters; document in spec |

## Rollback Plan

All changes are className-level edits and one small JSX addition (`<input type="date">`). Revert is a single `git revert <sha>` of the feature commit(s). No migrations, no data changes, no dependency updates. If a specific component regresses, its file can be reverted individually.

## Dependencies

None. No new packages. Tailwind v4 already installed and configured.

## Success Criteria

- [ ] `TransactionTable` renders as a readable card list at 320px with no horizontal scroll
- [ ] `DashboardShell` header does not overflow or crush the CTA at 320–375px
- [ ] `DebtSection` rows wrap cleanly when description is long on ≤375px
- [ ] Delete modals in `TransactionTable` and `DebtSection` render with side margins on 320px screens
- [ ] `TransactionForm` modal has visible margin on both sides at 320px AND exposes a working date input
- [ ] Auth-bar email truncates instead of overflowing on ≤375px
- [ ] Zero visual regressions at `sm` (640px), `md` (768px), `lg` (1024px), and desktop widths
- [ ] No new dependencies added to `package.json`
