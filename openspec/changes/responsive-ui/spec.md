# Responsive Layout Specification

## Purpose

Defines the required rendering behavior for finanzas-app across mobile (320–639px),
tablet (640–1023px), and desktop (1024px+) viewports. All breakpoint boundaries use
Tailwind v4 defaults: `sm` = 640px, `lg` = 1024px.

---

## Requirements

### Requirement: R-1 — TransactionTable Mobile Card Layout

The TransactionTable MUST render as a card list on screens narrower than 640px and
as a `<table>` on screens 640px and wider. Both representations MUST consume the
same filtered dataset. The filter bar and totals footer MUST be rendered once,
outside the card/table swap, shared by both layouts. The delete confirmation modal
MUST have side margins on all screen sizes (MUST NOT bleed to viewport edges).

#### Scenario: Mobile user views transaction list at 320px

- GIVEN the viewport width is less than 640px
- WHEN the TransactionTable renders
- THEN the `<table>` element is not visible
- AND each transaction is displayed as a full-width card showing all transaction fields
- AND no horizontal scroll is required to read any field

#### Scenario: Desktop user views transaction list at 1024px

- GIVEN the viewport width is 1024px or wider
- WHEN the TransactionTable renders
- THEN the card list is not visible
- AND the `<table>` is displayed as-is with all columns

#### Scenario: Filters apply equally to both layouts

- GIVEN any viewport width
- WHEN the user applies a filter or the data changes
- THEN the filtered dataset is reflected in whichever layout is currently visible
- AND the totals footer reflects the same filtered dataset

#### Scenario: Delete modal has safe margins on 320px

- GIVEN the viewport width is 320px
- WHEN the delete confirmation modal opens
- THEN the modal does not touch the left or right viewport edge
- AND the modal content is fully readable without horizontal scroll

---

### Requirement: R-2 — DashboardShell Header Responsive Stack

The DashboardShell header MUST stack the page title and the primary CTA button
vertically on screens narrower than 640px. On screens 640px and wider the header
MUST restore a horizontal row with space between title and CTA.

#### Scenario: Header stacks on a 375px phone

- GIVEN the viewport width is 375px
- WHEN the Dashboard page renders
- THEN the page title and the CTA button appear on separate lines
- AND the CTA button is reachable without horizontal scroll

#### Scenario: Header is side-by-side on tablet and desktop

- GIVEN the viewport width is 640px or wider
- WHEN the Dashboard page renders
- THEN the page title and CTA button appear on the same horizontal row
- AND the layout matches the current desktop design

---

### Requirement: R-3 — DebtSection Card Row Wrap

Debt list items MUST wrap across two lines on screens narrower than 640px: the
description MUST appear on the top line and the amount with action buttons MUST
appear on the bottom line. On screens 640px and wider the current single-row
layout MUST be preserved. The delete confirmation modal MUST have the same
safe-margin treatment defined in R-1.

#### Scenario: Debt row wraps with long description at 375px

- GIVEN a debt item with a description longer than 20 characters
- AND the viewport width is 375px
- WHEN the DebtSection renders
- THEN the description is displayed on its own line
- AND the amount and action buttons appear on the line below it
- AND no text is clipped or overflowing

#### Scenario: Debt row stays single-line at 640px

- GIVEN any debt item
- AND the viewport width is 640px or wider
- WHEN the DebtSection renders
- THEN description, amount, and action buttons appear on a single row

#### Scenario: Debt delete modal has safe margins on 320px

- GIVEN the viewport width is 320px
- WHEN the debt delete confirmation modal opens
- THEN the modal does not touch the left or right viewport edge

---

### Requirement: R-4 — TransactionForm Edge Safety Margin

The TransactionForm modal outer wrapper MUST have horizontal padding so the form
panel never touches the left or right viewport edge on screens as narrow as 320px.

#### Scenario: Form modal has side margins at 320px

- GIVEN the viewport width is 320px
- WHEN the TransactionForm modal opens (create or edit)
- THEN there is visible space between the form panel and each side of the viewport
- AND the form content is fully usable without horizontal scroll

---

### Requirement: R-5 — Auth Bar Email Truncation

The email address displayed in the top-right auth bar MUST be truncated with an
ellipsis when it would otherwise overflow its container on narrow screens. The
maximum rendered width MUST NOT exceed 180px.

#### Scenario: Long email truncates at narrow width

- GIVEN the user's email is longer than can fit in 180px
- AND the viewport width is 375px or narrower
- WHEN the layout renders
- THEN the email is truncated with an ellipsis
- AND no layout overflow or horizontal scroll is introduced

#### Scenario: Short email is displayed in full

- GIVEN the user's email fits within 180px
- WHEN the layout renders at any viewport width
- THEN the full email is displayed without truncation

---

### Requirement: R-6 — TransactionForm Missing Date Input (Bundled Bug Fix)

TransactionForm MUST render an `<input type="date">` field labelled "Fecha". The
field MUST be required. The field MUST be pre-populated with the existing `date`
state value when editing a transaction. Submitting the form MUST include the date
value in the payload without changing any other field's submit behavior.

#### Scenario: Date field visible on new transaction form

- GIVEN the TransactionForm modal opens in create mode
- WHEN the form renders
- THEN a date input labelled "Fecha" is visible and empty (or defaults to today)
- AND the field is marked required

#### Scenario: Date field pre-populated in edit mode

- GIVEN an existing transaction with a known date value
- WHEN the TransactionForm modal opens in edit mode for that transaction
- THEN the date input is pre-populated with that transaction's date
- AND the value matches the stored date exactly

#### Scenario: Form submission includes the date

- GIVEN the date input is filled
- WHEN the user submits the form
- THEN the submitted payload contains the date value
- AND all other fields (description, amount, type, category) are unaffected

---

## Out of Scope

- Custom Tailwind breakpoints or `tailwind.config.ts` changes
- Mobile navigation patterns (hamburger, bottom nav, drawer, sidebar)
- CSS container queries
- Theming, color, or typography changes
- New dependencies or UI libraries
- Visual redesign of any component beyond layout/spacing adjustments
