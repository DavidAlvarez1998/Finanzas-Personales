/**
 * Maps PendingOpType → Server Action call.
 * Each handler receives the stored payload and returns the server-confirmed row
 * (or void for deletes).
 */
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/app/actions/transactions'
import {
  createDebt,
  updateDebt,
  deleteDebt,
  createDebtPayment,
  deleteDebtPayment,
} from '@/app/actions/debts'
import {
  createPresupuesto,
  updatePresupuesto,
  deletePresupuesto,
  createPresupuestoItem,
  updatePresupuestoItem,
  deletePresupuestoItem,
} from '@/app/actions/presupuestos'
import {
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addContribution,
  deleteContribution,
  updateGoalStatusInternal,
} from '@/app/actions/savings'
import {
  updateUserCurrencies,
  updateDisplayCurrency,
} from '@/app/actions/currencies'
import type { PendingOp } from './schema'
import type {
  Transaction,
  Debt,
  DebtPayment,
  Presupuesto,
  PresupuestoItem,
  SavingsGoal,
  SavingsContribution,
} from '@/types'

function toFormData(obj: Record<string, unknown>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(obj)) {
    if (v != null) fd.set(k, String(v))
  }
  return fd
}

/** Call a Server Action and throw on error result. Returns the server row. */
async function callAction<T>(
  fn: (fd: FormData) => Promise<{ error: string } | { row: T } | void>,
  fd: FormData
): Promise<T | void> {
  const result = await fn(fd)
  if (result && 'error' in result) {
    throw Object.assign(new Error(result.error), { __validation: true })
  }
  if (result && 'row' in result) return result.row as T
}

/** Call a Server Action that takes (id, FormData) and throw on error. */
async function callActionWithId<T>(
  fn: (id: string, fd: FormData) => Promise<{ error: string } | { row: T } | void>,
  id: string,
  fd: FormData
): Promise<T | void> {
  const result = await fn(id, fd)
  if (result && 'error' in result) {
    throw Object.assign(new Error(result.error), { __validation: true })
  }
  if (result && 'row' in result) return result.row as T
}

/** Call a Server Action that takes just an id. */
async function callDeleteAction(
  fn: (id: string) => Promise<{ error: string } | void>,
  id: string
): Promise<void> {
  const result = await fn(id)
  if (result && 'error' in result) {
    throw Object.assign(new Error(result.error), { __validation: true })
  }
}

/**
 * Call a Server Action with direct (non-FormData) arguments.
 * Used for actions like updateGoalStatusInternal, updateUserCurrencies.
 */
async function callActionDirect<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (...args: any[]) => Promise<{ error: string } | { row: T } | void>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): Promise<T | void> {
  const result = await fn(...args)
  if (result && 'error' in result) {
    throw Object.assign(new Error(result.error), { __validation: true })
  }
  if (result && 'row' in result) return result.row as T
}

export type HandlerResult =
  | Transaction
  | Debt
  | DebtPayment
  | Presupuesto
  | PresupuestoItem
  | SavingsGoal
  | SavingsContribution
  | { currencies: string[] }
  | { display_currency: string | null }
  | null
  | void

export async function handle(op: PendingOp): Promise<HandlerResult> {
  const payload = op.payload as Record<string, unknown>

  switch (op.type) {
    // ── Transactions ──────────────────────────────────────────────────
    case 'transaction.create': {
      // DashboardShell stores {income, expense} in the payload for optimistic Dexie writes.
      // createTransaction Server Action expects {type, amount} — map here.
      const type = payload.income != null ? 'income' : 'expense'
      const amount = (payload.income != null ? payload.income : payload.expense) as number
      const mapped: Record<string, unknown> = {
        ...payload,
        type,
        amount: String(amount),
      }
      delete mapped.income
      delete mapped.expense
      return callAction(createTransaction, toFormData(mapped))
    }
    case 'transaction.update': {
      const { id, ...rest } = payload
      return callActionWithId(updateTransaction, id as string, toFormData(rest))
    }
    case 'transaction.delete': {
      await callDeleteAction(deleteTransaction, payload.id as string)
      return null
    }

    // ── Debts ─────────────────────────────────────────────────────────
    case 'debt.create': {
      return callAction(createDebt, toFormData(payload))
    }
    case 'debt.update': {
      const { id, ...rest } = payload
      return callActionWithId(updateDebt, id as string, toFormData(rest))
    }
    case 'debt.delete': {
      await callDeleteAction(deleteDebt, payload.id as string)
      return null
    }
    case 'debt_payment.create': {
      const { debt_id, ...rest } = payload
      return callActionWithId(createDebtPayment, debt_id as string, toFormData(rest))
    }
    case 'debt_payment.delete': {
      await callDeleteAction(deleteDebtPayment, payload.id as string)
      return null
    }

    // ── Presupuestos ──────────────────────────────────────────────────
    case 'presupuesto.create': {
      return callAction(createPresupuesto, toFormData(payload))
    }
    case 'presupuesto.update': {
      const { id, ...rest } = payload
      return callActionWithId(updatePresupuesto, id as string, toFormData(rest))
    }
    case 'presupuesto.delete': {
      await callDeleteAction(deletePresupuesto, payload.id as string)
      return null
    }
    case 'presupuesto_item.create': {
      const { presupuesto_id, ...rest } = payload
      return callActionWithId(createPresupuestoItem, presupuesto_id as string, toFormData(rest))
    }
    case 'presupuesto_item.update': {
      const { id, ...rest } = payload
      return callActionWithId(updatePresupuestoItem, id as string, toFormData(rest))
    }
    case 'presupuesto_item.delete': {
      await callDeleteAction(deletePresupuestoItem, payload.id as string)
      return null
    }

    // ── Savings Goals ─────────────────────────────────────────────────
    case 'savings_goal.create': {
      return callAction(createSavingsGoal, toFormData(payload))
    }
    case 'savings_goal.update': {
      const { id, ...rest } = payload
      return callActionWithId(updateSavingsGoal, id as string, toFormData(rest))
    }
    case 'savings_goal.delete': {
      await callDeleteAction(deleteSavingsGoal, payload.id as string)
      return null
    }
    case 'savings_goal.status': {
      // Uses updateGoalStatusInternal — accepts 'completed' (bypasses user guard)
      return callActionDirect(
        updateGoalStatusInternal,
        payload.goal_id as string,
        payload.status
      )
    }

    // ── Savings Contributions ─────────────────────────────────────────
    case 'savings_contribution.create': {
      const { goal_id, ...rest } = payload
      return callActionWithId(addContribution, goal_id as string, toFormData(rest))
    }
    case 'savings_contribution.delete': {
      await callDeleteAction(deleteContribution, payload.id as string)
      return null
    }

    // ── Currencies ────────────────────────────────────────────────────
    case 'user.currencies': {
      return callActionDirect(updateUserCurrencies, payload.codes as string[])
    }
    case 'user.display_currency': {
      return callActionDirect(updateDisplayCurrency, payload.code as string | null)
    }

    default: {
      // Exhaustiveness guard — should never be reached with known op types
      throw Object.assign(
        new Error(`Unhandled op type: ${op.type}`),
        { __validation: true }
      )
    }
  }
}
