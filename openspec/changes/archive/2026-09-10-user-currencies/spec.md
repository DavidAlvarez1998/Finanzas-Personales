# Spec: user-currencies

## Purpose

Define what the system MUST do after the `user-currencies` change is applied.
Covers the truncation fix (R-1) and the full user-managed currencies feature (R-2 through R-8).

---

## Requirements

### R-1: Currency Select Width Fix

The currency `<select>` containers in `PresupuestosSection` and `TransactionForm` MUST be wide enough to display any three-letter currency code (e.g., "COP") without visual clipping at all viewport sizes.

#### Scenario: COP renders without clipping

- GIVEN the dashboard is loaded
- WHEN the user views the currency select in PresupuestosSection or TransactionForm
- THEN the full code "COP" is visible without truncation

#### Scenario: Longer codes also render

- GIVEN the user has selected "USD" or "EUR" as a currency
- WHEN the currency dropdown is rendered
- THEN the code is fully visible with no overflow or ellipsis

---

### R-2: Currency Picker Modal Access

The system MUST expose a gear icon in the dashboard header that opens a `CurrencyPicker` modal. The modal MUST NOT require navigation to a separate route.

#### Scenario: Gear icon visible on dashboard

- GIVEN an authenticated user is on the dashboard
- WHEN the page renders
- THEN a settings gear icon is visible in the dashboard header

#### Scenario: Clicking gear opens the modal

- GIVEN the dashboard is loaded
- WHEN the user clicks the gear icon
- THEN the `CurrencyPicker` modal opens inline without a route change

---

### R-3: CurrencyPicker — Searchable World Currency List

The `CurrencyPicker` modal MUST display a searchable list of world currencies. Each entry MUST show the emoji flag, the ISO 4217 code, and the currency name. The list source MUST be a static file with no runtime npm dependency.

#### Scenario: Currency list renders on open

- GIVEN the CurrencyPicker modal is open
- WHEN it renders
- THEN at least all currencies listed in R-8 are shown, each with flag emoji + code + name

#### Scenario: Search filters the list

- GIVEN the CurrencyPicker modal is open
- WHEN the user types "peso" in the search field
- THEN only currencies whose code or name contains "peso" (case-insensitive) are displayed

#### Scenario: Search with no matches

- GIVEN the user types a string that matches no currency
- WHEN the list updates
- THEN an empty-state message is shown instead of the list

---

### R-4: Toggle and Persist Currency Selection

The system MUST allow the user to toggle currencies on and off. The final selection MUST persist via a Server Action that writes to `public.users.currencies`. The action MUST authenticate via `verifySession()`.

#### Scenario: User saves a selection

- GIVEN the CurrencyPicker modal is open and the user has toggled currencies
- WHEN the user submits the form
- THEN `updateUserCurrencies(codes)` is called with the selected codes
- AND the dashboard data revalidates so form dropdowns reflect the new selection on next render

#### Scenario: User deselects all currencies

- GIVEN the user removes all toggled currencies and submits
- WHEN the Server Action completes
- THEN `public.users.currencies` is stored as an empty array `{}`

#### Scenario: Unauthenticated call is rejected

- GIVEN a request reaches `updateUserCurrencies` without a valid session
- WHEN `verifySession()` is called
- THEN the action returns an auth error and does NOT write to the database

---

### R-5: Form Components Receive currencies Prop

`TransactionForm`, `DebtSection`, `PresupuestosSection`, and `SavingsSection` MUST each accept a `currencies: string[]` prop. No `CURRENCIES` constant MAY remain defined inside any of these four components.

#### Scenario: Prop drives the dropdown

- GIVEN a form component receives `currencies: ['COP', 'USD', 'EUR']`
- WHEN the currency dropdown renders
- THEN exactly those three options appear in the order provided

#### Scenario: No local constant fallback

- GIVEN the component file
- WHEN it is inspected
- THEN no inline `CURRENCIES` or equivalent constant array is present in the file

---

### R-6: DashboardShell Threads currencies Prop

`DashboardShell` MUST accept `currencies: string[]` as a prop from `app/page.tsx` and MUST pass it to each of the four form components. `DashboardShell` MUST NOT fetch currencies itself.

#### Scenario: Prop flows through without modification

- GIVEN `page.tsx` passes `currencies: ['MXN', 'USD']` to `DashboardShell`
- WHEN DashboardShell renders
- THEN each child form component receives `currencies: ['MXN', 'USD']` unchanged

---

### R-7: Empty Array Falls Back to Default

When `public.users.currencies` is an empty array, the system MUST substitute `['COP', 'USD']` before passing the value to form components. This substitution MUST occur in `DashboardShell` or `app/page.tsx`, NOT inside individual form components.

#### Scenario: New user sees default currencies

- GIVEN a user has no stored currencies (empty array from DB)
- WHEN the dashboard loads
- THEN form components receive `['COP', 'USD']`

#### Scenario: Stored non-empty array is not altered

- GIVEN a user has stored `['EUR', 'GBP', 'JPY']`
- WHEN the dashboard loads
- THEN form components receive exactly `['EUR', 'GBP', 'JPY']`

#### Scenario: Fallback is not applied in form components

- GIVEN a form component receives an empty `currencies` prop
- WHEN it renders
- THEN it renders with whatever it received — it does NOT define its own fallback

---

### R-8: Minimum World Currency Set in Picker

The static currency data source MUST include at minimum the following ISO 4217 codes, each with a correct emoji flag and English name:

`ARS, BOB, BRL, CAD, CHF, CLP, CNY, COP, EUR, GBP, GTQ, HNL, JPY, MXN, NIO, PEN, PYG, UYU, USD, VES`

(20 currencies — standard LatAm set plus major world currencies.)

#### Scenario: All required codes present

- GIVEN the static currencies data file is loaded
- WHEN its entries are inspected
- THEN all 20 codes above are present, each with a non-empty emoji flag and name

#### Scenario: debts.ts default is COP

- GIVEN `app/actions/debts.ts` is inspected
- WHEN the default currency value is read
- THEN it is `'COP'`, not `'ARS'` or any other code
