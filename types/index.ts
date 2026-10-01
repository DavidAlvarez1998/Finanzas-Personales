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

export interface ImpersonationContext {
  adminUserId: string
  adminEmail: string
  targetEmail: string
}

export interface VerifiedSession {
  userId: string
  email: string
  status: UserStatus
  expires_at: string | null
  isSuperadmin: boolean
  /** Present only when a superadmin is actively impersonating another user */
  impersonation?: ImpersonationContext
}

export interface AdminUserRow {
  id: string
  email: string
  status: UserStatus
  expires_at: string | null
  created_at: string
}

export interface PresupuestoItem {
  id: string
  presupuesto_id: string
  nombre: string
  monto: number
  created_at?: string
}

export interface Presupuesto {
  id: string
  user_id?: string
  nombre: string
  total: number
  currency: string
  created_at?: string
  items?: PresupuestoItem[]
  /** Sum of items[].monto, computed in the DAL */
  monto_asignado?: number
  /** total - monto_asignado, computed in the DAL. Can be negative (over-budget) */
  monto_libre?: number
}

export type SavingsGoalStatus = 'active' | 'completed' | 'paused'

export interface SavingsContribution {
  id: string
  goal_id: string
  monto: number
  fecha: string
  nota?: string | null
  created_at?: string
}

export interface SavingsGoal {
  id: string
  user_id?: string
  nombre: string
  monto_objetivo: number
  currency: string
  status: SavingsGoalStatus
  created_at?: string
  contributions?: SavingsContribution[]
  /** Sum of contributions.monto, computed by DAL */
  total_aportado?: number
  /** max(0, monto_objetivo - total_aportado), computed by DAL */
  remaining?: number
  /** (total_aportado / monto_objetivo) * 100, computed by DAL. May exceed 100. */
  progress_pct?: number
}

export type InvestmentStatus = 'active' | 'completed' | 'withdrawn'
export type ReturnPeriod = 'monthly' | 'quarterly' | 'annual' | 'one_time' | 'custom'

export interface InvestmentReturn {
  id: string
  investment_id: string
  monto: number
  fecha: string
  nota?: string | null
  created_at?: string
}

export interface Investment {
  id: string
  user_id?: string
  nombre: string
  descripcion?: string | null
  principal: number
  currency: string
  fecha_inicio: string
  fecha_vencimiento?: string | null
  tasa_esperada?: number | null
  periodo_retorno: ReturnPeriod
  status: InvestmentStatus
  created_at?: string
  /** Sorted by fecha DESC, computed by DAL */
  returns?: InvestmentReturn[]
  /** Sum of returns[].monto, computed by DAL */
  total_retornos?: number
  /** (total_retornos / principal) * 100, computed by DAL */
  roi_pct?: number
}

export interface FxRateResponse {
  rate: number
  from: string
  to: string
}

export interface ConvertedTotals {
  income: number
  expense: number
  balance: number
  currency: string
}
