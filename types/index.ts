export interface Transaction {
  id: string
  user_id?: string
  date: string
  description: string
  income: number | null
  expense: number | null
  currency?: string
  category?: string | null
  created_at?: string
}

export interface DebtPayment {
  id: string
  debt_id: string
  amount: number
  paid_at: string
  note?: string | null
  created_at?: string
}

export interface Debt {
  id: string
  user_id?: string
  description: string
  amount: number
  currency: string
  created_at?: string
  payments?: DebtPayment[]
  total_paid?: number
  remaining?: number
}

/** Legacy state shape — kept for backward compatibility during transition */
export interface FinanzasState {
  transactions: Transaction[]
  debts: Debt[]
}

export type TransactionType = 'income' | 'expense'

export interface CurrencyGroup {
  currency: string
  income: number
  expense: number
  balance: number
}

export interface MonthSummary {
  month: string
  year: number
  totalIncome: number
  totalExpense: number
  balance: number
}

/** Discriminated union for Server Action return values */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export type UserStatus = 'pending' | 'active' | 'inactive'

export interface VerifiedSession {
  userId: string
  email: string
  status: UserStatus
  expires_at: string | null
  isSuperadmin: boolean
}

export interface AdminUserRow {
  id: string
  email: string
  status: UserStatus
  expires_at: string | null
  created_at: string
}
