export interface Transaction {
  id: string
  date: string
  description: string
  income: number | null
  expense: number | null
}

export interface Debt {
  id: string
  description: string
  amount: string
  currency: string
}

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
