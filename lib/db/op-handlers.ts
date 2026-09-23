/**
 * Maps PendingOpType → Server Action call.
 * Each handler receives the stored payload and returns the server-confirmed row
 * (or void for deletes).
 *
 * PR1 scope: transaction.create / transaction.update / transaction.delete only.
 */
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/app/actions/transactions'
import type { PendingOp } from './schema'
import type { Transaction } from '@/types'

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

export type HandlerResult = Transaction | null | void

export async function handle(op: PendingOp): Promise<HandlerResult> {
  const payload = op.payload as Record<string, unknown>

  switch (op.type) {
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
    default: {
      // Future op types (PR2+) are not handled here yet.
      throw Object.assign(
        new Error(`Unhandled op type: ${op.type}`),
        { __validation: true }
      )
    }
  }
}
