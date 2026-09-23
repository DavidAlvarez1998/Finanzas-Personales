/**
 * Unified write entry point for all mutations.
 *
 * Behavior:
 * 1. Generate client UUID if payload has no id.
 * 2. Apply optimistic Dexie write + enqueue pending_op in ONE transaction.
 * 3. If online, call drainQueue() and await it before returning.
 * 4. If offline, return immediately — Dexie reflects the change.
 */
import { db } from './index'
import type { PendingOpType, PendingOp } from './schema'
import type {
  Transaction,
  Debt,
  DebtPayment,
  Presupuesto,
  PresupuestoItem,
  SavingsGoal,
  SavingsContribution,
} from '@/types'

export type WriteOpResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

type Payload = Record<string, unknown>

/** Apply optimistic Dexie mutations before the op is confirmed by the server. */
async function applyOptimistic(type: PendingOpType, payload: Payload): Promise<void> {
  switch (type) {
    // ── Transactions ──────────────────────────────────────────────────
    case 'transaction.create': {
      const record: Transaction = {
        id: payload.id as string,
        user_id: payload.user_id as string,
        date: payload.date as string,
        description: payload.description as string,
        income: payload.income != null ? Number(payload.income) : null,
        expense: payload.expense != null ? Number(payload.expense) : null,
        currency: (payload.currency as string) ?? 'COP',
        category: (payload.category as string | null) ?? null,
      }
      await db.transactions.put(record)
      break
    }
    case 'transaction.update': {
      const existing = await db.transactions.get(payload.id as string)
      if (existing) {
        // DashboardShell sends {type, amount} — derive income/expense for the Dexie record.
        const amount = payload.amount != null ? Number(payload.amount) : null
        const incomeVal = payload.type === 'income' ? amount : null
        const expenseVal = payload.type === 'expense' ? amount : null
        const updated: Transaction = {
          ...existing,
          date: (payload.date as string) ?? existing.date,
          description: (payload.description as string) ?? existing.description,
          income: incomeVal,
          expense: expenseVal,
          currency: (payload.currency as string) ?? existing.currency,
          category: (payload.category as string | null) ?? existing.category,
        }
        await db.transactions.put(updated)
      }
      break
    }
    case 'transaction.delete': {
      await db.transactions.delete(payload.id as string)
      break
    }

    // ── Debts ─────────────────────────────────────────────────────────
    case 'debt.create': {
      const record: Debt = {
        id: payload.id as string,
        user_id: payload.user_id as string,
        description: (payload.description as string) ?? '',
        amount: Number(payload.amount),
        currency: (payload.currency as string) ?? 'COP',
        created_at: (payload.created_at as string) ?? new Date().toISOString(),
        payments: [],
        total_paid: 0,
        remaining: Number(payload.amount),
      }
      await db.debts.put(record)
      break
    }
    case 'debt.update': {
      await db.debts.update(payload.id as string, {
        description: payload.description as string,
        amount: Number(payload.amount),
        currency: payload.currency as string,
      })
      break
    }
    case 'debt.delete': {
      await db.debts.delete(payload.id as string)
      break
    }
    case 'debt_payment.create': {
      const record: DebtPayment = {
        id: payload.id as string,
        debt_id: payload.debt_id as string,
        amount: Number(payload.amount),
        paid_at: (payload.paid_at as string) ?? new Date().toISOString().split('T')[0],
        note: (payload.note as string | null) ?? null,
      }
      await db.debt_payments.put(record)
      break
    }
    case 'debt_payment.delete': {
      await db.debt_payments.delete(payload.id as string)
      break
    }

    // ── Presupuestos ──────────────────────────────────────────────────
    case 'presupuesto.create': {
      const record: Presupuesto = {
        id: payload.id as string,
        user_id: payload.user_id as string,
        nombre: (payload.nombre as string) ?? '',
        total: Number(payload.total),
        currency: (payload.currency as string) ?? 'COP',
        created_at: (payload.created_at as string) ?? new Date().toISOString(),
        items: [],
        monto_asignado: 0,
        monto_libre: Number(payload.total),
      }
      await db.presupuestos.put(record)
      break
    }
    case 'presupuesto.update': {
      await db.presupuestos.update(payload.id as string, {
        nombre: payload.nombre as string,
        total: Number(payload.total),
        currency: payload.currency as string,
      })
      break
    }
    case 'presupuesto.delete': {
      await db.presupuestos.delete(payload.id as string)
      break
    }
    case 'presupuesto_item.create': {
      const record: PresupuestoItem = {
        id: payload.id as string,
        presupuesto_id: payload.presupuesto_id as string,
        nombre: (payload.nombre as string) ?? '',
        monto: Number(payload.monto),
        created_at: (payload.created_at as string) ?? new Date().toISOString(),
      }
      await db.presupuesto_items.put(record)
      break
    }
    case 'presupuesto_item.update': {
      await db.presupuesto_items.update(payload.id as string, {
        nombre: payload.nombre as string,
        monto: Number(payload.monto),
      })
      break
    }
    case 'presupuesto_item.delete': {
      await db.presupuesto_items.delete(payload.id as string)
      break
    }

    // ── Savings Goals ─────────────────────────────────────────────────
    case 'savings_goal.create': {
      const record: SavingsGoal = {
        id: payload.id as string,
        user_id: payload.user_id as string,
        nombre: (payload.nombre as string) ?? '',
        monto_objetivo: Number(payload.monto_objetivo),
        currency: (payload.currency as string) ?? 'COP',
        status: (payload.status as 'active' | 'completed' | 'paused') ?? 'active',
        created_at: (payload.created_at as string) ?? new Date().toISOString(),
        contributions: [],
        total_aportado: 0,
        remaining: Number(payload.monto_objetivo),
        progress_pct: 0,
      }
      await db.savings_goals.put(record)
      break
    }
    case 'savings_goal.update': {
      await db.savings_goals.update(payload.id as string, {
        nombre: payload.nombre as string,
        monto_objetivo: Number(payload.monto_objetivo),
        currency: payload.currency as string,
      })
      break
    }
    case 'savings_goal.delete': {
      await db.savings_goals.delete(payload.id as string)
      break
    }
    case 'savings_goal.status': {
      await db.savings_goals.update(payload.goal_id as string, {
        status: payload.status as 'active' | 'completed' | 'paused',
      })
      break
    }
    case 'savings_contribution.create': {
      const record: SavingsContribution = {
        id: payload.id as string,
        goal_id: payload.goal_id as string,
        monto: Number(payload.monto),
        fecha: (payload.fecha as string) ?? new Date().toISOString().split('T')[0],
        nota: (payload.nota as string | null) ?? null,
      }
      await db.savings_contributions.put(record)

      // Client-side auto-complete: re-sum contributions for this goal.
      // If total >= monto_objetivo and goal is 'active', flip to 'completed'.
      const goalId = payload.goal_id as string
      const goal = await db.savings_goals.get(goalId)
      if (goal && goal.status === 'active') {
        const contributions = await db.savings_contributions
          .where('goal_id')
          .equals(goalId)
          .toArray()
        const total = contributions.reduce((sum, c) => sum + Number(c.monto), 0)
        if (total >= Number(goal.monto_objetivo)) {
          await db.savings_goals.update(goalId, { status: 'completed' })
        }
      }
      break
    }
    case 'savings_contribution.delete': {
      await db.savings_contributions.delete(payload.id as string)
      break
    }

    // ── Currencies ────────────────────────────────────────────────────
    case 'user.currencies': {
      await db.meta.put({ key: 'user_currencies', value: payload.codes as string[] })
      break
    }
    case 'user.display_currency': {
      await db.meta.put({ key: 'display_currency', value: payload.code as string | null })
      break
    }

    default:
      // Unknown op type — no optimistic write
      break
  }
}

/** Returns the set of Dexie tables that a given op type may touch. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTablesForOp(type: PendingOpType): any[] {
  const tables: ReturnType<typeof db.table>[] = [db.pending_ops as ReturnType<typeof db.table>]

  if (type.startsWith('transaction.')) {
    tables.push(db.transactions as ReturnType<typeof db.table>)
  } else if (type.startsWith('debt_payment.')) {
    tables.push(db.debt_payments as ReturnType<typeof db.table>)
  } else if (type.startsWith('debt.')) {
    tables.push(db.debts as ReturnType<typeof db.table>)
  } else if (type.startsWith('presupuesto_item.')) {
    tables.push(db.presupuesto_items as ReturnType<typeof db.table>)
  } else if (type.startsWith('presupuesto.')) {
    tables.push(db.presupuestos as ReturnType<typeof db.table>)
  } else if (type === 'savings_contribution.create') {
    // Needs both contributions and goals for auto-complete check
    tables.push(
      db.savings_contributions as ReturnType<typeof db.table>,
      db.savings_goals as ReturnType<typeof db.table>
    )
  } else if (type.startsWith('savings_contribution.')) {
    tables.push(db.savings_contributions as ReturnType<typeof db.table>)
  } else if (type.startsWith('savings_goal.')) {
    tables.push(db.savings_goals as ReturnType<typeof db.table>)
  } else if (type.startsWith('user.')) {
    tables.push(db.meta as ReturnType<typeof db.table>)
  }

  return tables
}

export async function writeOp(
  type: PendingOpType,
  payload: Payload
): Promise<WriteOpResult> {
  // Assign client UUID for creates that don't have an id
  if (!payload.id) {
    payload = { ...payload, id: crypto.randomUUID() }
  }

  const id = payload.id as string
  const now = Date.now()

  const op: PendingOp = {
    id: crypto.randomUUID(),
    type,
    payload,
    optimistic_id: type.endsWith('.delete') ? undefined : id,
    status: 'queued',
    attempts: 0,
    created_at: now,
    updated_at: now,
    error: null,
  }

  const tables = getTablesForOp(type)

  await db.transaction('rw', tables, async () => {
    await applyOptimistic(type, payload)
    await db.pending_ops.put(op)
  })

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    // Lazy import to avoid circular dependency at module init time
    const { drainQueue } = await import('./sync')
    await drainQueue()
  }

  return { ok: true, id }
}
