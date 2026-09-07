# Spec: data-model — Transaction Categories + Debt Partial Payments

## Requirements

### R-1 — Category dropdown in TransactionForm

The TransactionForm component must render a `<select>` for category.

- When `type === 'income'`, the options are the entries of `INCOME_CATEGORIES`.
- When `type === 'expense'`, the options are the entries of `EXPENSE_CATEGORIES`.
- The first option is always an empty placeholder ("Sin categoría" or equivalent).
- When the user changes the transaction type, the selected category resets to `''`.
- The field is optional — leaving it empty is valid.

### R-2 — Category is optional and backward-compatible

- The `category` column in `transactions` is nullable with no default.
- Existing transactions without a category display no badge / empty cell — no error, no "(none)" label unless the design calls for it.
- The `onSave` payload from TransactionForm includes `category: string | null` (null when empty string or unset).
- Server actions for create and update accept `category` as an optional field.

### R-3 — Category visible in TransactionTable

- Desktop view: a "Categoría" column appears after "Descripción".
- Mobile card view: category is shown as a small badge if present; nothing rendered if null.
- No filtering or sorting by category is required.

### R-4 — Debt card shows balance summary

Each debt card in DebtSection displays three values:

| Label | Value |
|---|---|
| Original | `debt.amount` (full amount at creation) |
| Abonado | `debt.total_paid` (sum of all payments, 0 if none) |
| Restante | `debt.remaining` (`amount - total_paid`) |

All three values are formatted consistently with the rest of the app (es-AR integer format).

### R-5 — "+ Abonar" button opens a mini payment form

- Each debt card has a button labelled "+ Abonar".
- Clicking it opens a mini form inline on that card (not a modal).
- Only one mini form is open at a time — opening a form on card B closes any form on card A.
- The mini form contains:
  - `AmountInput` for the payment amount (required, > 0)
  - A plain text input for an optional note
  - A "Confirmar" submit button
  - A "Cancelar" button that closes the form without saving

### R-6 — Recording a payment updates the card immediately

- Submitting the mini form calls the `createDebtPayment` server action.
- The action calls `revalidatePath('/')` so the Next.js cache is invalidated.
- The page re-renders with updated `total_paid` and `remaining` without a full navigation.
- After successful submission, the mini form closes.

### R-7 — Payment history list is not required

- Individual payment records are stored in `debt_payments` but are NOT listed in the UI.
- Only the aggregated summary (R-4) is displayed.
- This can be added in a future change.

## Non-requirements

- Editing or deleting individual payments
- Category analytics or charts
- Category filtering on the transactions list
- Custom user-defined categories
