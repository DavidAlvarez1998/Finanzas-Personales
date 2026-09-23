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
import type { Transaction } from '@/types'

export type WriteOpResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

type Payload = Record<string, unknown>

/** Apply optimistic Dexie mutations before the op is confirmed by the server. */
async function applyOptimistic(type: PendingOpType, payload: Payload): Promise<void> {
  switch (type) {
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
    default:
      // PR2+ ops — no optimistic write yet
      break
  }
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

  // Determine which Dexie tables the optimistic write will touch
  const tables = [db.pending_ops, db.transactions]

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
