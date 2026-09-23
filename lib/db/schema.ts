import Dexie, { type Table } from 'dexie'
import type {
  Transaction,
  Debt,
  DebtPayment,
  Presupuesto,
  PresupuestoItem,
  SavingsGoal,
  SavingsContribution,
} from '@/types'

export type PendingOpStatus = 'queued' | 'processing' | 'failed' | 'completed'

export type PendingOpType =
  | 'transaction.create'
  | 'transaction.update'
  | 'transaction.delete'
  | 'debt.create'
  | 'debt.update'
  | 'debt.delete'
  | 'debt_payment.create'
  | 'debt_payment.delete'
  | 'presupuesto.create'
  | 'presupuesto.update'
  | 'presupuesto.delete'
  | 'presupuesto_item.create'
  | 'presupuesto_item.update'
  | 'presupuesto_item.delete'
  | 'savings_goal.create'
  | 'savings_goal.update'
  | 'savings_goal.delete'
  | 'savings_goal.status'
  | 'savings_contribution.create'
  | 'savings_contribution.delete'
  | 'user.currencies'
  | 'user.display_currency'

export interface PendingOp {
  id: string            // uuid
  type: PendingOpType
  payload: unknown      // JSON-serializable
  optimistic_id?: string // Dexie row this op created (for reconcile)
  status: PendingOpStatus
  attempts: number
  created_at: number    // Date.now()
  updated_at: number
  error: string | null
}

export interface FxRate {
  pair: string          // "USD_COP"
  rate: number
  fetched_at: number
  source: string
}

export interface Meta {
  key: string           // 'hydrated_user_id' | 'last_sync_at' | 'display_currency'
  value: unknown
}

export class FinanzasDB extends Dexie {
  transactions!: Table<Transaction, string>
  debts!: Table<Debt, string>
  debt_payments!: Table<DebtPayment, string>
  presupuestos!: Table<Presupuesto, string>
  presupuesto_items!: Table<PresupuestoItem, string>
  savings_goals!: Table<SavingsGoal, string>
  savings_contributions!: Table<SavingsContribution, string>
  pending_ops!: Table<PendingOp, string>
  fx_rates!: Table<FxRate, string>
  meta!: Table<Meta, string>

  constructor() {
    super('finanzas')
    this.version(1).stores({
      transactions:          'id, user_id, date, [user_id+date], currency',
      debts:                 'id, user_id, created_at, currency',
      debt_payments:         'id, debt_id, paid_at, [debt_id+paid_at]',
      presupuestos:          'id, user_id, created_at',
      presupuesto_items:     'id, presupuesto_id',
      savings_goals:         'id, user_id, status, [user_id+status], currency',
      savings_contributions: 'id, goal_id, fecha, [goal_id+fecha]',
      pending_ops:           'id, status, created_at, [status+created_at], type',
      fx_rates:              'pair, fetched_at',
      meta:                  'key',
    })
  }
}
