import { db } from './index'
import type { Transaction } from '@/types'

export interface SyncSnapshot {
  transactions: Transaction[]
}

/**
 * Returns true when the DB has not been hydrated for this userId yet.
 * This is the trigger for the first-boot hydration on OfflineProvider mount.
 */
export async function needsHydration(userId: string): Promise<boolean> {
  const m = await db.meta.get('hydrated_user_id')
  return !m || m.value !== userId
}

/**
 * Fetches a full snapshot from the server and bulk-writes it into Dexie
 * inside a single transaction. Idempotent — safe to call multiple times.
 *
 * PR1 scope: populates transactions only.
 * PR2 will extend this to also populate debts, presupuestos, savings_goals, etc.
 */
export async function hydrateFromServer(userId: string): Promise<void> {
  const res = await fetch('/api/sync', { cache: 'no-store' })

  if (res.status === 401) {
    // Expired JWT — bubble up so OfflineProvider can redirect.
    window.dispatchEvent(new CustomEvent('offline-sync:auth-expired'))
    return
  }

  if (!res.ok) {
    throw new Error(`Sync fetch failed: ${res.status}`)
  }

  const snapshot: SyncSnapshot = await res.json()

  await db.transaction('rw', db.transactions, db.meta, async () => {
    await db.transactions.bulkPut(snapshot.transactions)
    await db.meta.put({ key: 'hydrated_user_id', value: userId })
    await db.meta.put({ key: 'last_sync_at', value: Date.now() })
  })
}
