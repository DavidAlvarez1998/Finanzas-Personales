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
import type { Transaction } from '@/types'

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

/** Reconcile Dexie with the server-confirmed row after a successful op. */
async function reconcile(op: PendingOp, serverRow: Transaction | null | void): Promise<void> {
  if (serverRow == null) {
    // Delete ops — nothing to reconcile (optimistic delete already applied)
    return
  }

  if (op.optimistic_id && op.optimistic_id !== serverRow.id) {
    // Server returned a different ID — swap the record
    await db.transaction('rw', db.transactions, async () => {
      await db.transactions.delete(op.optimistic_id!)
      await db.transactions.put(serverRow)
    })
  } else {
    // Same ID — overwrite with server-confirmed data (timestamps, etc.)
    await db.transactions.put(serverRow)
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
