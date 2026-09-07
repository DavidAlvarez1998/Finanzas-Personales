# Design: Responsive UI

## Context

`finanzas-app` currently ships with a desktop-first layout. Only 2 `sm:` utilities exist in the codebase, so mobile (320–639px) breaks in five specific spots. This design turns the change into surgical class edits plus one missing input — no new deps, no config, no component library.

Stack constraints:
- Next.js App Router (v16+)
- Tailwind CSS v4 (config-less; imported via `@import "tailwindcss"` in `app/globals.css`)
- React 19 (client components with hooks already established)

Design goal: **mobile-first className edits, zero refactor of state/data flow**.

---

## Architecture Decisions

### ADR-1 — Dual-render pattern for TransactionTable (Option A)

**Decision**: Use two sibling wrappers guarded by responsive visibility utilities:
- `<div className="hidden sm:block">…<table>…</table>…</div>` — desktop table
- `<div className="block sm:hidden space-y-2">…cards…</div>` — mobile card list

Both iterate the **same** `filtered` array. Filter bar and month-total footer live **outside** the swap.

**Rejected alternatives**:

| Alternative | Why rejected |
|-------------|--------------|
| Option B — CSS-only `display: block` on `<table>` at narrow widths (single markup) | Tailwind v4 has no config file here; would require raw CSS inside `globals.css` or arbitrary variants. Semantic markup breaks (`<tr>` as block loses table semantics for screen readers on mobile). Column-to-label mapping needs `data-*` + `::before` content, which fights Tailwind. Complexity ↑, benefit = negligible for a 5-column table. |
| Extract `<TransactionRow>` + `<TransactionCard>` components | Adds 2 files for ~8 lines of JSX each. Premature abstraction — proposal is a className pass. |
| CSS container queries (`@container`) | Tailwind v4 supports them, but the app has no sidebars/nested containers — viewport breakpoints suffice. Adds cognitive load with zero UX gain. |

**Rationale**: Option A is the least clever solution. The row body is 4 fields (`date`, `description`, `income`, `expense`) + 2 buttons — inlining twice is cheaper than any abstraction. Filter/totals stay outside the swap, so both representations always reflect the same data.

**Drift mitigation**: Loose contract — both renderings MUST use the identical `filtered.map()` source. If a future field is added, both branches must be updated. Verify manually via a smoke test at 320px vs 1024px. Not worth a shared helper for 4 fields.

---

### ADR-2 — Tailwind default breakpoints only

**Decision**: Use `sm:` (640px) and (only when needed) `lg:` (1024px). Do NOT introduce custom breakpoints or a `tailwind.config.ts`.

**Rejected**: `xs:` custom breakpoint at 480px. Tailwind v4 recommends `min-[Npx]:` arbitrary variants for one-off needs; nothing in this change requires it.

**Rationale**: v4 is config-less by design in this project (`app/globals.css` is a single `@import "tailwindcss";`). Adding config would ripple beyond this change.

---

### ADR-3 — Mobile-first className authoring

**Decision**: Base classes describe the **mobile** layout; `sm:`/`lg:` layer widens for larger viewports. Example: header goes `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`.

**Rejected**: Desktop-first with `max-sm:` overrides — inverts Tailwind's recommended direction and reads backwards.

---

### ADR-4 — Modal width tokens

**Decision**: Standardize confirmation modals on `w-full max-w-xs mx-4` (fills viewport minus 32px total gutter, capped at 320px on wider screens). Form modals keep their current `w-full max-w-sm` / `w-full max-w-md` but the **outer wrapper** of `TransactionForm` gets `px-4` to guarantee a gutter on 320px devices.

**Rationale**: Confirmation modals are short-text, so the 320px cap looks right. Form modals need more room; their outer `flex` overlay already centers, but `max-w-md` (448px) collides with a 320px viewport — a `px-4` on the overlay wrapper provides the safe gutter without changing the card's `max-w-*` value.

---

## Data Flow

Unchanged. This is a **presentation layer** change:
- Same server-loaded `transactions` / `debts` props into `DashboardShell`
- Same client-side filter state in `TransactionTable` (`filterMonth`, `filterYear`)
- Same Server Action wiring (`createTransaction`, `updateTransaction`, `deleteTransaction`, `createDebt`, `updateDebt`, `deleteDebt`)
- Same modal state pattern (`deletingId`, `showForm`, `editing`)

No new hooks, no context, no state reshuffling.

---

## Component Design (before → after)

### 1. `components/TransactionTable.tsx`

#### 1.1 Wrap table + cards in responsive swap

Current structure (lines 92–161):
```tsx
{/* Table */}
<div className="overflow-x-auto rounded-xl border border-zinc-800">
  <table className="w-full text-sm">…</table>
</div>
```

Target structure:
```tsx
{/* Desktop table — sm and up */}
<div className="hidden sm:block overflow-x-auto rounded-xl border border-zinc-800">
  <table className="w-full text-sm">
    {/* unchanged thead/tbody/tfoot */}
  </table>
</div>

{/* Mobile card list — below sm */}
<div className="block sm:hidden space-y-2">
  {filtered.length === 0 ? (
    <div className="rounded-xl border border-zinc-800 py-10 text-center text-sm text-zinc-600">
      No hay registros para {MONTHS[filterMonth]} {filterYear}
    </div>
  ) : (
    <>
      {filtered.map(t => (
        <div
          key={t.id}
          className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
        >
          {/* Top row: date + description */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-500">
                {new Date(t.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
              <p className="mt-0.5 text-sm font-medium text-white break-words">
                {t.description}
              </p>
            </div>
            {/* Amount on the right */}
            <div className="text-right shrink-0">
              {t.income != null && t.income !== 0 && (
                <p className="font-mono text-sm font-semibold text-emerald-400">{fmt(t.income)}</p>
              )}
              {t.expense != null && t.expense !== 0 && (
                <p className="font-mono text-sm font-semibold text-rose-400">{fmt(t.expense)}</p>
              )}
            </div>
          </div>
          {/* Bottom row: actions */}
          <div className="mt-3 flex justify-end gap-2 border-t border-zinc-800/60 pt-2">
            <button
              onClick={() => onEdit(t)}
              className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
            >
              Editar
            </button>
            <button
              onClick={() => confirmDelete(t.id)}
              className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-rose-900/50 hover:text-rose-400 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}

      {/* Month totals — mobile version */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Total del mes
        </p>
        <div className="flex justify-between font-mono text-sm font-bold">
          <span className="text-emerald-400">{fmt(monthIncome)}</span>
          <span className="text-rose-400">{fmt(monthExpense)}</span>
        </div>
      </div>
    </>
  )}
</div>
```

**Card layout rationale**:
- Top row (`flex items-start justify-between gap-3`): date/description on the left in a `min-w-0 flex-1` container so long descriptions wrap; amount on the right in a `shrink-0` right-aligned column. Only the non-null amount (income OR expense) renders — never both simultaneously per record.
- Bottom row: horizontal border + right-aligned Edit/Eliminar buttons, so the tap targets are separated from the info block.
- The totals card mirrors the `<tfoot>` semantically but as a plain div.

**Empty state** and **totals** are duplicated per branch (unavoidable in Option A) but their content is derived from the same `filtered`, `monthIncome`, `monthExpense` — no drift possible.

#### 1.2 Delete-modal width fix

Line 166 currently:
```tsx
<div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl w-80">
```

Change to:
```tsx
<div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl w-full max-w-xs mx-4">
```

---

### 2. `components/DashboardShell.tsx`

#### 2.1 Header layout

Line 108 currently:
```tsx
<div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
```

Change to:
```tsx
<div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
```

**Effect**: On mobile the title block sits above the CTA (both full-width in their content), each on its own row. On `sm+` the two align on a single row with `justify-between`, matching current desktop.

#### 2.2 CTA button (line 115)

Current:
```tsx
<button
  onClick={() => { setEditing(null); setShowForm(true) }}
  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition-colors shadow-lg shadow-sky-900/30"
>
  + Nuevo Registro
</button>
```

Change to:
```tsx
<button
  onClick={() => { setEditing(null); setShowForm(true) }}
  className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition-colors shadow-lg shadow-sky-900/30 sm:w-auto"
>
  + Nuevo Registro
</button>
```

**Effect**: Full-width tap target on mobile (Fitts's law — big and easy to hit), auto-width on `sm+`.

---

### 3. `components/DebtSection.tsx`

#### 3.1 Debt row wrapping

Lines 85–112 currently:
```tsx
<div
  key={d.id}
  className="flex items-center justify-between rounded-xl border border-amber-900/30 bg-amber-950/20 px-4 py-3"
>
  <div>
    <p className="text-sm font-semibold text-white">{d.description}</p>
    <p className="text-xs text-zinc-500 mt-0.5">{d.currency}</p>
  </div>
  <div className="flex items-center gap-4">
    <span className="font-mono text-base font-bold text-amber-400">
      {d.amount.toLocaleString('es-AR')}
    </span>
    <div className="flex gap-1">
      <button onClick={() => openEdit(d)} …>Editar</button>
      <button onClick={() => setDeletingId(d.id)} …>Eliminar</button>
    </div>
  </div>
</div>
```

Change the outer div to allow wrap, and add `min-w-0` to the description block:
```tsx
<div
  key={d.id}
  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-900/30 bg-amber-950/20 px-4 py-3"
>
  <div className="min-w-0 flex-1">
    <p className="text-sm font-semibold text-white break-words">{d.description}</p>
    <p className="text-xs text-zinc-500 mt-0.5">{d.currency}</p>
  </div>
  <div className="flex items-center gap-4">
    <span className="font-mono text-base font-bold text-amber-400">
      {d.amount.toLocaleString('es-AR')}
    </span>
    <div className="flex gap-1">
      <button onClick={() => openEdit(d)} …>Editar</button>
      <button onClick={() => setDeletingId(d.id)} …>Eliminar</button>
    </div>
  </div>
</div>
```

**Rationale**:
- `flex-wrap` + `gap-3` allows the amount/action cluster to drop to a second line when the description is long on a 320px screen.
- `min-w-0 flex-1` on the description block lets `break-words` actually wrap (flex children default to `min-width: auto`, which prevents wrapping).
- Amount cluster is kept as one unit — we don't want amount and buttons to split across rows.

#### 3.2 Delete-modal width fix

Line 184 currently:
```tsx
<div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl w-80">
```

Change to:
```tsx
<div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl w-full max-w-xs mx-4">
```

**Note on the Debt form modal** (lines 119–120): already uses `w-full max-w-sm`. Add `px-4` to the outer overlay wrapper (line 119) for consistency:

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
```

---

### 4. `components/TransactionForm.tsx`

#### 4.1 Outer overlay gutter

Line 41 currently:
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
```

Change to:
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
```

#### 4.2 Missing date input (bundled bug fix)

`date` state already exists (line 13) and is included in the `onSave` payload (line 32) but the input is never rendered.

**Where**: Insert as the FIRST field in the form, above the `Descripción` field (currently line 48–60). Reason: chronological input order matches how users think about a transaction ("when → what → how much"), and `date` is already pre-populated with today's ISO date so the user typically skips past it.

Insert this block immediately after `<form onSubmit={handleSubmit} className="space-y-4">` (line 47) and before the current `Descripción` div (line 48):

```tsx
<div>
  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
    Fecha
  </label>
  <input
    type="date"
    value={date}
    onChange={e => setDate(e.target.value)}
    required
    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
  />
</div>
```

**Notes**:
- `type="date"` is a native input; on iOS/Android it opens the native date picker — no library needed.
- The `value` binds to the existing `date` state (ISO `YYYY-MM-DD`), which is the format `<input type="date">` expects.
- No validation change: `handleSubmit` already checks `if (!date …) return`.
- Label text `Fecha` matches the Spanish convention of every other label in the form.

---

### 5. `app/layout.tsx`

#### 5.1 Auth-bar email truncation

Line 41–42 currently:
```tsx
<div className="flex items-center justify-end gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800/60 text-xs text-zinc-500">
  <span>{userEmail}</span>
```

Change the `<span>` element:
```tsx
<span className="truncate max-w-[180px]">{userEmail}</span>
```

**Rationale**:
- `truncate` = `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` in one utility.
- `max-w-[180px]` caps the email to 180px, forcing the ellipsis on long addresses at ≤375px viewports.
- 180px chosen to leave ~90px minimum for the "Cerrar sesión" button on a 320px viewport (`320 - 32 (px-4) - 12 (gap-3) - 90 (button) = 186px` available).
- No `sm:` variant needed — 180px is fine on any viewport (long emails always look better truncated in a header bar).

Also add `min-w-0` to the outer div's flex behavior so the truncation actually engages when the flex children would otherwise stretch:

```tsx
<div className="flex items-center justify-end gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800/60 text-xs text-zinc-500">
```

No change needed on the outer wrapper — `justify-end` already positions the span correctly, and `truncate` engages via `max-w-[180px]` regardless of flex context (the `min-w-0` gotcha applies when a flex child is stretched by `flex-1`, not here where the span is auto-sized then capped).

---

## Integration Points

| Layer | Touched? | Notes |
|-------|----------|-------|
| Server Actions (`app/actions/*.ts`) | No | Zero changes. |
| Supabase DAL (`lib/supabase/*`) | No | Zero changes. |
| `types/index.ts` | No | Same `Transaction` / `Debt` shape. |
| Global CSS (`app/globals.css`) | No | All changes are Tailwind utilities. |
| `package.json` | No | No new dependencies. |

---

## Risks & Assumptions

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Card view and table view drift as fields are added later | Medium | Manual test at 320px + 1024px after any field addition. Not worth an abstraction now. |
| Native `<input type="date">` UX differs per browser/OS | Low | Acceptable — this is the standard behavior; a picker library would be scope creep. |
| `truncate max-w-[180px]` looks arbitrary | Low | 180px chosen from arithmetic against the 320px baseline; documented above. Revisit if we add elements to the auth bar. |
| `flex-wrap` on debt row causes an odd two-row layout on borderline widths (e.g. 400px) | Low | The `gap-3` provides breathing room; the two-row state is legitimate mobile layout, not a bug. |
| Modal `mx-4` + `max-w-xs` combo could look narrow on tablets (640–768px) | Low | Confirmation modals are 3-line dialogs — narrow is fine. Form modals keep their wider `max-w-sm`/`max-w-md`. |

**Assumptions**:
- User has already accepted Option A tradeoff (JSX duplication for table/card) from the proposal.
- Tailwind v4's default breakpoints (`sm: 640px`, `md: 768px`, `lg: 1024px`) are acceptable — no per-project customization.
- Card view does not need column headers on mobile (rows are self-describing via labels and colors).

---

## Rollback

Every change here is either a className diff or a single JSX block insertion. `git revert <sha>` fully rolls back. No migrations, no state changes, no dep bumps. Files can be reverted independently.

---

## Verification Approach (deferred to `sdd-tasks`)

Manual viewport checks at 320px, 375px, 640px, 768px, 1024px on:
- Ledger view (empty state + populated)
- Debt view (with long-description entry)
- Both delete modals open
- TransactionForm open (including native date picker interaction)
- Auth bar with a long email like `verylongusername@somelongdomain.example.com`

Automated regression coverage is out of scope — no visual regression tooling in the repo today.
