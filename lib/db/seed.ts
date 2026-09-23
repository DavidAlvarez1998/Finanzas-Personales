import { db } from './index'
import type { Transaction, Debt, DebtPayment, Presupuesto, PresupuestoItem, SavingsGoal, SavingsContribution } from '@/types'

export interface SyncSnapshot {
  transactions: Transaction[]
  debts: Debt[]
  debt_payments: DebtPayment[]
  presupuestos: Presupuesto[]
  presupuesto_items: PresupuestoItem[]
  savings_goals: SavingsGoal[]
  savings_contributions: SavingsContribution[]
  currencies: string[]
  display_currency: string | null
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

  await db.transaction(
    'rw',
    [
      db.transactions,
      db.debts,
      db.debt_payments,
      db.presupuestos,
      db.presupuesto_items,
      db.savings_goals,
      db.savings_contributions,
      db.meta,
    ],
    async () => {
      await db.transactions.bulkPut(snapshot.transactions)
      await db.debts.bulkPut(snapshot.debts)
      await db.debt_payments.bulkPut(snapshot.debt_payments)
      await db.presupuestos.bulkPut(snapshot.presupuestos)
      await db.presupuesto_items.bulkPut(snapshot.presupuesto_items)
      await db.savings_goals.bulkPut(snapshot.savings_goals)
      await db.savings_contributions.bulkPut(snapshot.savings_contributions)
      await db.meta.put({ key: 'user_currencies', value: snapshot.currencies })
      await db.meta.put({ key: 'display_currency', value: snapshot.display_currency })
      await db.meta.put({ key: 'hydrated_user_id', value: userId })
      await db.meta.put({ key: 'last_sync_at', value: Date.now() })
    }
  )
}
