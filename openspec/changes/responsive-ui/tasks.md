# Tasks: responsive-ui

Change: `responsive-ui`
Spec: `sdd/responsive-ui/spec`
Design: `sdd/responsive-ui/design`
Branch: `feature/supabase-slice-2`

---

## Execution Order

Tasks are grouped by file. Within each group the order is top-to-bottom in the
file so edits do not invalidate each other's line references. All groups are
SEQUENTIAL — each task is a single atomic edit that can be committed alone.

---

## Group A — TransactionForm (R-6, R-4)

Two tasks in this file. R-6 (bug fix: missing date input) is highest user
impact and goes first. R-4 (overlay margin) is a one-liner that follows.

- [ ] TASK-1: [R-6] Insert `<input type="date">` as first field in TransactionForm
  File: `components/TransactionForm.tsx`
  Where: before the Descripción `<div>` block (currently line 48)
  What: add a new `<div>` with label "Fecha", `<input type="date">`, `value={date}`,
        `onChange={e => setDate(e.target.value)}`, `required`, same className as
        description input. State `date` and `setDate` already exist (line 13).
  Spec: R-6 — TransactionForm MUST render a date input; it MUST be pre-populated
        in edit mode (useEffect on line 18-25 already calls `setDate(editing.date)`).

- [ ] TASK-2: [R-4] Add `px-4` to TransactionForm outer overlay div
  File: `components/TransactionForm.tsx`
  Where: line 41, outer `<div className="fixed inset-0 z-50 ...">` 
  What: append `px-4` to the className string
  Spec: R-4 — overlay MUST have horizontal padding so the panel never touches
        the viewport edge on 320px screens.

---

## Group B — TransactionTable (R-1)

Three tasks. The card-list insertion (TASK-3) is the largest single edit;
the delete-modal fix (TASK-5) is independent but grouped here for locality.

- [ ] TASK-3: [R-1] Wrap existing table in `hidden sm:block` div
  File: `components/TransactionTable.tsx`
  Where: line 93, the outer `<div className="overflow-x-auto rounded-xl ...">` 
  What: wrap it in `<div className="hidden sm:block">...</div>`
  Spec: R-1 — table MUST NOT be visible below 640px.

- [ ] TASK-4: [R-1] Insert mobile card list (`block sm:hidden`) after the table wrapper
  File: `components/TransactionTable.tsx`
  Where: after the closing `</div>` of the table wrapper (currently line 161)
  What: add `<div className="block sm:hidden space-y-2">` containing:
    - Empty-state message when `filtered.length === 0`
    - `filtered.map(t => ...)` card: outer `<div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 space-y-2">`
      - Top row: `<div className="flex items-start justify-between gap-3">`
        - Info block (`min-w-0 flex-1`): date in `text-xs text-zinc-400`, description in `text-sm text-white break-words`
        - Amount column (`shrink-0 text-right`): render only the non-null of income/expense with emerald/rose colour
      - Bottom row: `<div className="flex justify-end gap-2 border-t border-zinc-800 pt-2">`
        - Editar button (same `onEdit` handler)
        - Eliminar button (same `confirmDelete` handler)
    - Month-totals card at end of list (mirrors `<tfoot>`, same `monthIncome`/`monthExpense` values)
  Spec: R-1 — card list MUST consume same `filtered` dataset; totals MUST reflect
        filtered data; no horizontal scroll on 320px.

- [ ] TASK-5: [R-1] Fix delete modal width in TransactionTable
  File: `components/TransactionTable.tsx`
  Where: line 166, `<div className="rounded-2xl border ... w-80">`
  What: replace `w-80` with `w-full max-w-xs mx-4`
  Spec: R-1 — delete modal MUST NOT touch viewport edges on 320px.

---

## Group C — DashboardShell (R-2)

Two tasks, both in the header section (lines 108–120).

- [ ] TASK-6: [R-2] Make header inner div stack vertically on mobile
  File: `components/DashboardShell.tsx`
  Where: line 108, `<div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">`
  What: replace `flex items-center justify-between` with
        `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`
  Spec: R-2 — title and CTA MUST stack on viewports narrower than 640px.

- [ ] TASK-7: [R-2] Make CTA button full-width on mobile
  File: `components/DashboardShell.tsx`
  Where: line 117, the `+ Nuevo Registro` button className
  What: prepend `w-full sm:w-auto` to the existing className
  Spec: R-2 — CTA MUST be reachable without horizontal scroll on 375px.

---

## Group D — DebtSection (R-3)

Three tasks: row wrap, description block, and delete-modal width.
The form-modal overlay in DebtSection does NOT need `px-4` — it already uses
`w-full max-w-sm` on the card (line 120), which is self-contained. The outer
overlay is `fixed inset-0 flex items-center justify-center` — the card is safe.
Only the delete modal needs the width fix (same pattern as TransactionTable).

- [ ] TASK-8: [R-3] Add `flex-wrap gap-y-2` to debt row outer flex div
  File: `components/DebtSection.tsx`
  Where: line 87, `<div className="flex items-center justify-between rounded-xl ...">`
  What: add `flex-wrap gap-y-2` to the className (keep `items-center justify-between`)
  Spec: R-3 — debt row MUST wrap to two lines on narrow screens.

- [ ] TASK-9: [R-3] Add `min-w-0 flex-1 break-words` to debt description block
  File: `components/DebtSection.tsx`
  Where: line 89, `<div>` wrapping the description `<p>` and currency `<p>`
  What: add `min-w-0 flex-1` to the `<div>`, add `break-words` to the description `<p>` (line 90)
  Spec: R-3 — description MUST NOT clip or overflow; MUST appear on its own line.

- [ ] TASK-10: [R-3] Fix delete modal width in DebtSection
  File: `components/DebtSection.tsx`
  Where: line 184, `<div className="rounded-2xl border ... w-80">`
  What: replace `w-80` with `w-full max-w-xs mx-4`
  Spec: R-3 — delete modal MUST have safe margins on 320px (same ADR-4 token as R-1).

---

## Group E — app/layout.tsx (R-5)

Single task, lowest risk.

- [ ] TASK-11: [R-5] Add email truncation to auth bar span
  File: `app/layout.tsx`
  Where: line 42, `<span>{userEmail}</span>`
  What: add `className="truncate max-w-[180px]"` to the `<span>`
  Spec: R-5 — email MUST truncate with ellipsis; MUST NOT exceed 180px rendered width.

---

## Dependency Map

```
TASK-1 → TASK-2   (same file; TASK-1 first so line numbers stay stable for TASK-2)
TASK-3 → TASK-4   (TASK-3 wraps table; TASK-4 inserts sibling after it)
TASK-5            (independent modal fix, same file — can merge after TASK-4)
TASK-6 → TASK-7   (same header block; do in order)
TASK-8 → TASK-9   (same row element; TASK-8 changes parent, TASK-9 changes child)
TASK-10           (independent, same file)
TASK-11           (fully independent)
```

Cross-file groups (A, B, C, D, E) are all independent of each other and can be
applied in any order or in a single commit. Sequential ordering within a group
is only required to avoid line-number drift during a manual edit session.

---

## Review Workload Forecast

| Metric | Estimate |
|--------|----------|
| Files touched | 5 |
| Tasks (atomic edits) | 11 |
| Lines changed — className diffs (TASK-2,3,5,6,7,8,9,10,11) | ~18 lines |
| Lines added — card list JSX (TASK-4) | ~45–55 lines |
| Lines added — date input field (TASK-1) | ~8 lines |
| **Total estimated delta** | **~70–80 lines** |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Decision needed before apply | No |

All changes are pure presentation-layer className edits plus one JSX insertion.
No logic changes, no new dependencies, no type changes. A single PR is appropriate
and well within the 400-line review budget.
