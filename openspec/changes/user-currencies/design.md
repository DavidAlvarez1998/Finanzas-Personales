# Design: User-Managed Currencies

## Technical Approach

Two-phase delivery. Unit 1 is a surgical two-line CSS fix. Unit 2 wires a `currencies text[]` column on `public.users` through a new DAL function → `page.tsx` `Promise.all` → `DashboardShell` prop → four child form components, with a `CurrencyPicker` modal exposed from the header gear icon calling a dedicated Server Action.

No global state, no Context, no new npm packages. All new interfaces are explicitly typed; the static currency list is a plain TypeScript const array.

---

## Architecture Decisions

### D-1: Migration file number

| Option | Decision |
|--------|----------|
| `0008_user_currencies.sql` | **Chosen** |
| `20260910_user_currencies.sql` | Rejected |

**Rationale**: existing migrations use the `0001…0007` sequential prefix. The date-stamped outlier (`20260909_user_status.sql`) is an anomaly. Following the dominant convention keeps sorting deterministic and intent readable.

---

### D-2: `updateUserCurrencies` signature — direct args, not FormData

| Option | Decision |
|--------|----------|
| `(codes: string[])` direct args | **Chosen** |
| `(formData: FormData)` | Rejected |

**Rationale**: FormData is used throughout this codebase when forms post serialised field bags (debts, transactions). `CurrencyPicker` holds a typed `string[]` state — serialising it to FormData and back would be pure ceremony. Server Actions accept any serialisable argument; typed arrays are cleaner and safer to validate.

---

### D-3: CurrencyPicker — modal (fixed overlay)

| Option | Decision |
|--------|----------|
| Fixed overlay modal | **Chosen** |
| Inline panel / drawer | Rejected |
| Dedicated `/settings` route | Rejected (out of scope) |

**Rationale**: The pattern already exists in this codebase — `TransactionForm` is itself a fixed overlay modal (`fixed inset-0 z-50`). Reusing that pattern keeps the mental model consistent for users and avoids adding a new route. An inline panel would push main content down and fight the sticky header's `z-10`. A drawer requires an animation layer not present elsewhere.

**Modal layout** (text description):
```
┌──────────────────────────────────────────────────┐
│ [✕]  Monedas                                     │  ← header row, sticky
├──────────────────────────────────────────────────┤
│ [🔍 Buscar moneda...                           ] │  ← search input
├──────────────────────────────────────────────────┤
│  🇨🇴 COP  Peso Colombiano          [✓ Activa]   │
│  🇺🇸 USD  Dólar Estadounidense     [+ Agregar]  │
│  🇪🇺 EUR  Euro                     [+ Agregar]  │
│  …                                               │
│  (scroll, up to ~20 entries visible at once)     │
├──────────────────────────────────────────────────┤
│              [Guardar cambios]                   │  ← sticky footer
└──────────────────────────────────────────────────┘
```
Each row: flag emoji + ISO code (bold) + full name. Toggle button cycles between "active" (filled/green) and "inactive" (outline). Save button calls `updateUserCurrencies` with the current selection then closes modal.

---

### D-4: Fallback `['COP', 'USD']` applied in DashboardShell

| Option | Decision |
|--------|----------|
| Apply fallback in `DashboardShell` | **Chosen** |
| Apply in `page.tsx` | Rejected |
| Apply in each form component | Rejected |

**Rationale**: `page.tsx` is a Server Component — it should return raw DB data, not apply business defaults. Individual components shouldn't know about the fallback strategy. `DashboardShell` is the single composition point that receives the raw prop and fans it out; it's the correct place for the one-line default: `const effectiveCurrencies = currencies.length > 0 ? currencies : ['COP', 'USD']`.

---

### D-5: Static currency data — TypeScript const array in `lib/constants/currencies.ts`

| Option | Decision |
|--------|----------|
| `lib/constants/currencies.ts` (TS const array) | **Chosen** |
| `lib/data/currencies.json` (JSON file) | Rejected |

**Rationale**: The proposal mentioned a JSON file; the design corrects this. A `.ts` file is tree-shakeable by the bundler, gets type inference without an extra `import type`, and is consistent with how this project manages other constants (no `lib/data/` directory exists). A JSON import requires `resolveJsonModule` and adds a runtime parse step with no benefit at this scale (~20 entries).

---

### D-6: CurrencyPicker search — client-side filter on static list

| Option | Decision |
|--------|----------|
| Client-side filter with `useMemo` | **Chosen** |
| Server-side/API search | Rejected |

**Rationale**: ~20 entries. `useMemo(() => CURRENCIES.filter(...), [query])` is zero-latency and zero-infrastructure. An API would be absurd here.

---

### D-7: Prop name on form components — `currencies: string[]`

| Option | Decision |
|--------|----------|
| `currencies: string[]` | **Chosen** |
| `availableCurrencies`, `currencyOptions`, etc. | Rejected |

**Rationale**: Matches the DB column name, the DAL function return type, and the `DashboardShell` internal variable. One name across the entire stack reduces translation overhead.

---

## Data Flow

```
public.users.currencies (text[])
        │
        ▼
getUserCurrencies()          ← lib/supabase/dal.ts (Server)
        │
        ▼
Promise.all([...])           ← app/page.tsx (Server Component)
        │
        ▼
DashboardShell               ← components/DashboardShell.tsx ('use client')
  effectiveCurrencies = currencies.length > 0 ? currencies : ['COP', 'USD']
        │
        ├──▶ TransactionForm  (currencies prop)
        ├──▶ DebtSection      (currencies prop)
        ├──▶ PresupuestosSection (currencies prop)
        └──▶ SavingsSection   (currencies prop)

CurrencyPicker (modal, inside DashboardShell header):
  [open]  ← gear icon button onClick
  [save]  ─▶ updateUserCurrencies(codes)  ← app/actions/currencies.ts
                    │
                    ▼
             supabase.from('users').update({ currencies: codes })
                    │
                    ▼
             revalidatePath('/')  → page.tsx re-fetches → shell re-renders
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/0008_user_currencies.sql` | Create | `ALTER TABLE public.users ADD COLUMN currencies text[] NOT NULL DEFAULT '{}'` |
| `lib/constants/currencies.ts` | Create | Static `Currency[]` array (~20 LatAm + major world currencies) |
| `lib/supabase/dal.ts` | Modify | Add `getUserCurrencies(): Promise<string[]>` |
| `app/actions/currencies.ts` | Create | `updateUserCurrencies(codes: string[])` Server Action |
| `app/page.tsx` | Modify | Add `getUserCurrencies()` to `Promise.all`; pass `currencies` to `DashboardShell` |
| `components/DashboardShell.tsx` | Modify | Add `currencies` prop; compute `effectiveCurrencies`; render `CurrencyPicker`; thread prop to 4 sections |
| `components/CurrencyPicker.tsx` | Create | Modal component with search, toggle list, and save |
| `components/TransactionForm.tsx` | Modify | Remove local `CURRENCIES`; accept `currencies` prop; `w-20` → `w-24` |
| `components/DebtSection.tsx` | Modify | Remove local `CURRENCIES`; accept `currencies` prop |
| `components/PresupuestosSection.tsx` | Modify | Remove local `CURRENCIES`; accept `currencies` prop; `w-20` → `w-24` |
| `components/SavingsSection.tsx` | Modify | Remove local `CURRENCIES`; accept `currencies` prop |
| `app/actions/debts.ts` | Modify | Default `'ARS'` → `'COP'` on line 14 and line 48 |

---

## Interfaces / Contracts

```typescript
// lib/constants/currencies.ts
export interface Currency {
  code: string   // ISO 4217, e.g. 'COP'
  flag: string   // flag emoji, e.g. '🇨🇴'
  name: string   // full name in Spanish, e.g. 'Peso Colombiano'
}

export const CURRENCIES: Currency[] = [
  { code: 'COP', flag: '🇨🇴', name: 'Peso Colombiano' },
  { code: 'USD', flag: '🇺🇸', name: 'Dólar Estadounidense' },
  // … ~18 more entries
]
```

```typescript
// components/CurrencyPicker.tsx
interface CurrencyPickerProps {
  selected: string[]                            // currently active codes
  onClose: () => void                           // called to dismiss modal
}
// Note: no onSave callback — component calls updateUserCurrencies directly
// then calls onClose. DashboardShell passes showCurrencyPicker state setter as onClose.
```

```typescript
// components/DashboardShell.tsx — updated Props interface
interface Props {
  transactions: Transaction[]
  debts: Debt[]
  presupuestos: Presupuesto[]
  savingsGoals: SavingsGoal[]
  currencies: string[]          // ← new; raw from DB (may be empty)
}
```

```typescript
// app/actions/currencies.ts
// ALLOWLIST: codes present in CURRENCIES constant
export async function updateUserCurrencies(
  codes: string[]
): Promise<{ error: string } | void>
```

```typescript
// lib/supabase/dal.ts — new export
export async function getUserCurrencies(): Promise<string[]>
// Returns [] if column is empty. Never throws on empty — only on DB error.
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `getUserCurrencies` returns `[]` on empty array and correct codes when populated | Mock Supabase client |
| Unit | `updateUserCurrencies` rejects codes not in allowlist | Call with invalid code, assert `{ error }` returned |
| Unit | `DashboardShell` applies `['COP', 'USD']` fallback when `currencies=[]` | Render with empty prop, assert select options |
| Unit | `CurrencyPicker` filter narrows list by query | State-drive the search input |
| Integration | `page.tsx` `Promise.all` includes `getUserCurrencies` | Mock DAL, assert prop flows to shell |

---

## Migration / Rollout

Migration `0008_user_currencies.sql` must be applied **before** the feature code is deployed. The column has `DEFAULT '{}'` so existing rows are not affected and the app continues to work with the fallback. If the feature is reverted, the column stays inert — safe to leave in place.

Unit 1 (truncation fix) ships as PR #1 with no migration dependency.
Unit 2 (feature) ships as PR #2, gated on the migration.

---

## Open Questions

- None. All design decisions are resolved.
