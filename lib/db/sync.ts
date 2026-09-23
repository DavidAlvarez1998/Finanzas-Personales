/**
 * Serial FIFO drain of pending_ops.
 *
 * Error classification:
 * - 'auth'       → 401; pause, dispatch auth-expired event, break
 * - 'validation' → 4xx; mark failed, break (do NOT skip ahead)
 * - 'transient'  → 5xx/network; bounded retry (max 5, exp backoff), then fail
 */
import { db } from './index'
import { handle } from './op-handlers'
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

let draining = false

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

type ErrorClass = 'auth' | 'validation' | 'transient'

function classifyError(err: unknown): ErrorClass {
  if (err instanceof Error) {
    // __validation is set by op-handlers when Server Action returns { error }
    if ((err as Error & { __validation?: boolean }).__validation) return 'validation'
    // HTTP status errors from fetch-based calls
    const msg = err.message
    if (msg.includes('401') || msg.includes('Unauthorized')) return 'auth'
    if (/^4\d\d/.test(msg)) return 'validation'
  }
  return 'transient'
}

type ServerRow =
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

/** Reconcile Dexie with the server-confirmed row after a successful op. */
async function reconcile(op: PendingOp, serverRow: ServerRow): Promise<void> {
  if (serverRow == null) {
    // Delete ops or void returns — nothing to reconcile (optimistic delete already applied)
    return
  }

  const row = serverRow as { id: string }
  if (!row.id) return

  // Determine the target table based on op.type
  const opType = op.type

  if (opType.startsWith('transaction.')) {
    if (op.optimistic_id && op.optimistic_id !== row.id) {
      await db.transaction('rw', db.transactions, async () => {
        await db.transactions.delete(op.optimistic_id!)
        await db.transactions.put(serverRow as Transaction)
      })
    } else {
      await db.transactions.put(serverRow as Transaction)
    }
  } else if (opType === 'debt.create' || opType === 'debt.update') {
    if (op.optimistic_id && op.optimistic_id !== row.id) {
      await db.transaction('rw', db.debts, async () => {
        await db.debts.delete(op.optimistic_id!)
        await db.debts.put(serverRow as Debt)
      })
    } else {
      await db.debts.put(serverRow as Debt)
    }
  } else if (opType === 'debt_payment.create') {
    if (op.optimistic_id && op.optimistic_id !== row.id) {
      await db.transaction('rw', db.debt_payments, async () => {
        await db.debt_payments.delete(op.optimistic_id!)
        await db.debt_payments.put(serverRow as DebtPayment)
      })
    } else {
      await db.debt_payments.put(serverRow as DebtPayment)
    }
  } else if (opType === 'presupuesto.create' || opType === 'presupuesto.update') {
    if (op.optimistic_id && op.optimistic_id !== row.id) {
      await db.transaction('rw', db.presupuestos, async () => {
        await db.presupuestos.delete(op.optimistic_id!)
        await db.presupuestos.put(serverRow as Presupuesto)
      })
    } else {
      await db.presupuestos.put(serverRow as Presupuesto)
    }
  } else if (opType === 'presupuesto_item.create' || opType === 'presupuesto_item.update') {
    if (op.optimistic_id && op.optimistic_id !== row.id) {
      await db.transaction('rw', db.presupuesto_items, async () => {
        await db.presupuesto_items.delete(op.optimistic_id!)
        await db.presupuesto_items.put(serverRow as PresupuestoItem)
      })
    } else {
      await db.presupuesto_items.put(serverRow as PresupuestoItem)
    }
  } else if (
    opType === 'savings_goal.create' ||
    opType === 'savings_goal.update' ||
    opType === 'savings_goal.status'
  ) {
    if (op.optimistic_id && op.optimistic_id !== row.id) {
      await db.transaction('rw', db.savings_goals, async () => {
        await db.savings_goals.delete(op.optimistic_id!)
        await db.savings_goals.put(serverRow as SavingsGoal)
      })
    } else {
      await db.savings_goals.put(serverRow as SavingsGoal)
    }
  } else if (opType === 'savings_contribution.create') {
    if (op.optimistic_id && op.optimistic_id !== row.id) {
      await db.transaction('rw', db.savings_contributions, async () => {
        await db.savings_contributions.delete(op.optimistic_id!)
        await db.savings_contributions.put(serverRow as SavingsContribution)
      })
    } else {
      await db.savings_contributions.put(serverRow as SavingsContribution)
    }
  } else if (opType === 'user.currencies') {
    const data = serverRow as unknown as { currencies: string[] }
    await db.meta.put({ key: 'user_currencies', value: data.currencies })
  } else if (opType === 'user.display_currency') {
    const data = serverRow as unknown as { display_currency: string | null }
    await db.meta.put({ key: 'display_currency', value: data.display_currency })
  }
  // delete ops return null/void — handled by the serverRow == null guard above
}

/**
 * After reconciling a savings_contribution.create op, check if the goal
 * has reached its target and, if so, flip it to 'completed' in Dexie and
 * enqueue a savings_goal.status pending_op for the server.
 *
 * Spec R12 — auto-complete side effect.
 */
async function replicateSideEffects(op: PendingOp, _serverRow: ServerRow): Promise<void> {
  if (op.type !== 'savings_contribution.create') return

  const payload = op.payload as Record<string, unknown>
  const goalId = payload.goal_id as string
  if (!goalId) return

  const goal = await db.savings_goals.get(goalId)
  if (!goal || goal.status !== 'active') return

  const contributions = await db.savings_contributions
    .where('goal_id')
    .equals(goalId)
    .toArray()

  const total = contributions.reduce((sum, c) => sum + Number(c.monto), 0)

  if (total >= Number(goal.monto_objetivo)) {
    const now = Date.now()

    await db.transaction('rw', [db.savings_goals, db.pending_ops], async () => {
      // Flip goal status in Dexie immediately
      await db.savings_goals.update(goalId, { status: 'completed' })

      // Enqueue a pending_op so the server is also updated
      const statusOp: PendingOp = {
        id: crypto.randomUUID(),
        type: 'savings_goal.status',
        payload: { goal_id: goalId, status: 'completed' },
        optimistic_id: goalId,
        status: 'queued',
        attempts: 0,
        created_at: now,
        updated_at: now,
        error: null,
      }
      await db.pending_ops.put(statusOp)
    })
  }
}

export async function drainQueue(): Promise<void> {
  if (draining) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  draining = true
  try {
    while (true) {
      // Fetch the oldest queued op
      const op = await db.pending_ops
        .where('[status+created_at]')
        .between(['queued', -Infinity], ['queued', Infinity])
        .first()

      if (!op) break

      await db.pending_ops.update(op.id, {
        status: 'processing',
        updated_at: Date.now(),
      })

      try {
        const serverRow = await handle(op)
        await reconcile(op, serverRow)
        await replicateSideEffects(op, serverRow)
        await db.pending_ops.update(op.id, {
          status: 'completed',
          updated_at: Date.now(),
        })
      } catch (err) {
        const errClass = classifyError(err)

        if (errClass === 'auth') {
          // Preserve op in queued state so it can be retried after re-auth
          await db.pending_ops.update(op.id, {
            status: 'queued',
            updated_at: Date.now(),
          })
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline-sync:auth-expired'))
          }
          break
        }

        if (errClass === 'validation') {
          await db.pending_ops.update(op.id, {
            status: 'failed',
            error: err instanceof Error ? err.message : String(err),
            updated_at: Date.now(),
          })
          break // STOP — do not skip ahead
        }

        // Transient error — bounded retry with exponential backoff
        const attempts = op.attempts + 1
        if (attempts >= 5) {
          await db.pending_ops.update(op.id, {
            status: 'failed',
            attempts,
            error: err instanceof Error ? err.message : String(err),
            updated_at: Date.now(),
          })
          break
        }
        await db.pending_ops.update(op.id, {
          status: 'queued',
          attempts,
          updated_at: Date.now(),
        })
        await sleep(Math.min(2 ** attempts * 250, 8000))
      }
    }
  } finally {
    draining = false
  }
}
