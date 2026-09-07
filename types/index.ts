export interface Transaction {
  id: string
  user_id?: string
  date: string
  description: string
  income: number | null
  expense: number | null
  created_at?: string
}

export interface Debt {
  id: string
  user_id?: string
  description: string
  amount: number
  currency: string
  created_at?: string
}

/** Legacy state shape — kept for backward compatibility during transition */
export interface FinanzasState {
  transactions: Transaction[]
  debts: Debt[]
}

export type TransactionType = 'income' | 'expense'

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
