# Specification — supabase-auth-db

**Change:** `supabase-auth-db` | **Status:** specced | **Date:** 2026-09-06

---

## 1. Functional Requirements

### Requirement: User Registration

The system MUST allow a visitor to create an account with email and password. On success the user SHALL be redirected to `/`. On failure the system MUST return a localized error message to the form without a full-page reload.

#### Scenario: Successful registration

- GIVEN a visitor on `/login` who has no existing account
- WHEN they submit a valid email and password
- THEN a Supabase Auth account is created
- AND the user is redirected to `/`
- AND a session cookie is set

#### Scenario: Duplicate email

- GIVEN a visitor submitting an email already registered
- WHEN the Server Action calls `supabase.auth.signUp`
- THEN the action returns `{ error: "Email already in use" }`
- AND the login page re-renders with the error message visible
- AND no redirect occurs

---

### Requirement: User Login

The system MUST authenticate a registered user with email and password via a Server Action. On success the user SHALL be redirected to `/`. On failure the system MUST return an error without redirect.

#### Scenario: Successful login

- GIVEN a registered user on `/login`
- WHEN they submit correct credentials
- THEN the Server Action calls `supabase.auth.signInWithPassword`
- AND the session cookie is set
- AND the user is redirected to `/`

#### Scenario: Wrong credentials

- GIVEN a user submitting an incorrect password
- WHEN the Server Action receives an auth error
- THEN the action returns `{ error: "Invalid credentials" }`
- AND the page re-renders with the error visible
- AND no session is created

---

### Requirement: User Logout

The system MUST allow an authenticated user to log out. On logout the session cookie SHALL be cleared and the user SHALL be redirected to `/login`.

#### Scenario: Logout

- GIVEN an authenticated user
- WHEN they trigger the logout action
- THEN `supabase.auth.signOut` is called server-side
- AND the session cookie is cleared
- AND the user is redirected to `/login`

---

### Requirement: Route Protection

The system MUST redirect unauthenticated requests to `/` to `/login`. The guard SHALL run in `proxy.ts` exporting a function named `proxy`. A defense-in-depth `verifySession()` call MUST also exist in `app/page.tsx`.

#### Scenario: Unauthenticated access to root

- GIVEN a visitor with no session cookie
- WHEN they navigate to `/`
- THEN `proxy.ts` detects no session
- AND the response redirects to `/login`

#### Scenario: Authenticated access to root

- GIVEN a user with a valid session cookie
- WHEN they navigate to `/`
- THEN `proxy.ts` allows the request through
- AND `app/page.tsx` calls `verifySession()` which confirms the session
- AND the dashboard renders

#### Scenario: Unauthenticated access caught by defense-in-depth

- GIVEN a request that bypasses the proxy (e.g., direct server invocation)
- WHEN `app/page.tsx` calls `verifySession()`
- THEN the page redirects to `/login`

---

### Requirement: Transaction Data Access

The system MUST fetch transactions for the authenticated user from Supabase, scoped by `user_id = auth.uid()` via RLS. The DAL function `getTransactions` MUST verify the session before querying.

#### Scenario: Fetch own transactions

- GIVEN an authenticated user with existing transactions
- WHEN `getTransactions()` is called in a Server Component
- THEN the session is verified
- AND a Supabase query returns only rows where `user_id = auth.uid()`
- AND the data is passed as props to `DashboardShell`

#### Scenario: No session in DAL

- GIVEN a call to `getTransactions()` with no valid session
- WHEN `getSession()` returns null
- THEN the function throws or redirects — it MUST NOT execute the DB query

---

### Requirement: Debt Data Access

The system MUST fetch debts for the authenticated user, scoped by RLS. `getDebts()` MUST verify the session before querying.

#### Scenario: Fetch own debts

- GIVEN an authenticated user with existing debts
- WHEN `getDebts()` is called in a Server Component
- THEN the session is verified
- AND only rows where `user_id = auth.uid()` are returned

---

### Requirement: Transaction Mutations

The system MUST expose Server Actions for creating, updating, and deleting transactions. Each action MUST verify the session, operate only on the caller's rows, and call `revalidatePath('/')` on success.

#### Scenario: Create transaction

- GIVEN an authenticated user submitting a transaction form
- WHEN the `createTransaction` Server Action is invoked
- THEN the session is verified
- AND a row is inserted into `transactions` with `user_id` set to `auth.uid()`
- AND `revalidatePath('/')` is called
- AND the dashboard re-renders with the new transaction

#### Scenario: Update transaction

- GIVEN an authenticated user editing an existing transaction
- WHEN `updateTransaction(id, data)` is called
- THEN the update targets `id` AND `user_id = auth.uid()` (no cross-user write)
- AND `revalidatePath('/')` is called

#### Scenario: Delete transaction

- GIVEN an authenticated user
- WHEN `deleteTransaction(id)` is called
- THEN the delete targets `id` AND `user_id = auth.uid()`
- AND `revalidatePath('/')` is called

---

### Requirement: Debt Mutations

The system MUST expose Server Actions for creating, updating, and deleting debts with the same session-verify + revalidate pattern as transaction mutations.

#### Scenario: Create debt

- GIVEN an authenticated user submitting a debt form
- WHEN `createDebt` is invoked
- THEN a row is inserted with `user_id = auth.uid()` and `amount` as `number`
- AND `revalidatePath('/')` is called

#### Scenario: Update and delete debt

- GIVEN authenticated user
- WHEN `updateDebt(id, data)` or `deleteDebt(id)` is called
- THEN the operation filters on `id` AND `user_id = auth.uid()`
- AND `revalidatePath('/')` is called

---

### Requirement: Cross-User Data Isolation

The system MUST guarantee that User A cannot read or write User B's data. RLS MUST enforce this at the database level independently of application logic.

#### Scenario: RLS blocks cross-user read

- GIVEN two users A and B with separate transactions
- WHEN User A's session queries the `transactions` table
- THEN Supabase RLS returns only User A's rows — User B's rows are invisible

#### Scenario: RLS blocks cross-user write

- GIVEN User A attempts to delete a transaction owned by User B
- WHEN the delete query runs with User A's JWT
- THEN RLS causes 0 rows to be affected (no error, no mutation)

---

## 2. Non-Functional Requirements

### Requirement: TypeScript Strict Compliance

The system MUST compile with `strict: true` and zero type errors. `Debt.amount` MUST be `number` throughout — in `types/index.ts`, all components, and all form handlers. `parseFloat` MAY be used only at the network edge (form data parsing).

### Requirement: Server-First Initial Load

The system MUST NOT perform client-side data fetching for the initial page render. Transactions and debts MUST be fetched in Server Components and passed as props.

### Requirement: Environment Variable Guard

The system MUST throw a descriptive error at server Supabase client construction time if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, so misconfiguration surfaces at boot rather than at query time.

### Requirement: Suspense Boundaries

The system MUST wrap async Server Component subtrees in `<Suspense>` with a loading fallback. `app/error.tsx` MUST exist and handle unexpected runtime errors gracefully.

---

## 3. Schema Contracts

### Table: `transactions`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE |
| `date` | `date` | NOT NULL |
| `description` | `text` | NOT NULL |
| `income` | `numeric(12,2)` | NOT NULL, default 0 |
| `expense` | `numeric(12,2)` | NOT NULL, default 0 |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

### Table: `debts`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE |
| `description` | `text` | NOT NULL |
| `amount` | `numeric(14,2)` | NOT NULL |
| `currency` | `text` | NOT NULL, default `'ARS'` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

### RLS Policies

```sql
-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own data" ON transactions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- debts
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own data" ON debts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 4. DAL Contracts (`lib/supabase/dal.ts`)

| Function | Signature | Pre-condition | Returns |
|---|---|---|---|
| `getSession` | `() => Promise<Session>` | — | Active session or redirects to `/login` |
| `getTransactions` | `() => Promise<Transaction[]>` | Calls `getSession()` first | Array of own transactions |
| `getDebts` | `() => Promise<Debt[]>` | Calls `getSession()` first | Array of own debts |

All DAL functions MUST use the server Supabase client (`lib/supabase/server.ts`). They MUST NOT be called from Client Components.

---

## 5. Server Action Contracts (`app/actions/`)

### `auth.ts`

| Action | Signature | On success | On error |
|---|---|---|---|
| `login` | `(formData: FormData) => Promise<void>` | `redirect('/login')` after cookie set → redirects to `/` | Returns `{ error: string }` |
| `register` | `(formData: FormData) => Promise<void>` | Same as login | Returns `{ error: string }` |
| `logout` | `() => Promise<void>` | `redirect('/login')` | — |

### `transactions.ts`

| Action | Signature | Side effect |
|---|---|---|
| `createTransaction` | `(formData: FormData) => Promise<void>` | Insert + `revalidatePath('/')` |
| `updateTransaction` | `(id: string, data: Partial<Transaction>) => Promise<void>` | Update where `id` AND `user_id = auth.uid()` + revalidate |
| `deleteTransaction` | `(id: string) => Promise<void>` | Delete where `id` AND `user_id = auth.uid()` + revalidate |

### `debts.ts`

| Action | Signature | Side effect |
|---|---|---|
| `createDebt` | `(formData: FormData) => Promise<void>` | Insert + `revalidatePath('/')` |
| `updateDebt` | `(id: string, data: Partial<Debt>) => Promise<void>` | Update where `id` AND `user_id = auth.uid()` + revalidate |
| `deleteDebt` | `(id: string) => Promise<void>` | Delete where `id` AND `user_id = auth.uid()` + revalidate |

All Server Actions MUST verify the session before any DB operation. On unauthenticated calls they MUST redirect to `/login`.

---

## 6. Out of Scope

- Migration of existing localStorage data to Supabase
- OAuth / social login providers
- Custom password reset or magic link flows
- Supabase Realtime subscriptions
- Categories, budgets, or recurring transactions
- E2E automated tests (Playwright / Cypress)
- Custom rate limiting or abuse protection
- Multi-currency conversion logic
- Role-based access control beyond "own data" RLS
