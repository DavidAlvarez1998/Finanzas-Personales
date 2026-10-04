import { db } from './index'
import { drainQueue } from './sync'
import type { PendingOp } from './schema'
import type { Transaction, Debt, DebtPayment, Presupuesto, PresupuestoItem, SavingsGoal, SavingsContribution, Investment, InvestmentReturn } from '@/types'

export interface SyncSnapshot {
  transactions: Transaction[]
  debts: Debt[]
  debt_payments: DebtPayment[]
  presupuestos: Presupuesto[]
  presupuesto_items: PresupuestoItem[]
  savings_goals: SavingsGoal[]
  savings_contributions: SavingsContribution[]
  investments: Investment[]
  investment_returns: InvestmentReturn[]
  currencies: string[]
  display_currency: string | null
}

// ---------------------------------------------------------------------------
// Private types
// ---------------------------------------------------------------------------

interface ProtectedIds {
  transactions: Set<string>
  debts: Set<string>
  debt_payments: Set<string>
  presupuestos: Set<string>
  presupuesto_items: Set<string>
  savings_goals: Set<string>
  savings_contributions: Set<string>
  investments: Set<string>
  investment_returns: Set<string>
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Builds a per-table set of Dexie row IDs that must not be deleted during
 * the hydration clear step. A row is protected when a surviving pending_op
 * (status: queued | processing | failed) holds an optimistic_id pointing
 * at it. Delete ops have no optimistic_id and are never protected.
 */
function collectProtectedIdsByTable(ops: PendingOp[]): ProtectedIds {
  const result: ProtectedIds = {
    transactions: new Set(),
    debts: new Set(),
    debt_payments: new Set(),
    presupuestos: new Set(),
    presupuesto_items: new Set(),
    savings_goals: new Set(),
    savings_contributions: new Set(),
    investments: new Set(),
    investment_returns: new Set(),
  }
  for (const op of ops) {
    if (!op.optimistic_id) continue // delete ops & user.* ops have no optimistic_id
    const prefix = op.type.split('.')[0]
    switch (prefix) {
      case 'transaction':
        result.transactions.add(op.optimistic_id)
        break
      case 'debt':
        result.debts.add(op.optimistic_id)
        break
      case 'debt_payment':
        result.debt_payments.add(op.optimistic_id)
        break
      case 'presupuesto_item':
        result.presupuesto_items.add(op.optimistic_id)
        break
      case 'presupuesto':
        if (op.type.startsWith('presupuesto_item.')) {
          result.presupuesto_items.add(op.optimistic_id)
        } else {
          result.presupuestos.add(op.optimistic_id)
        }
        break
      case 'savings_goal':
        result.savings_goals.add(op.optimistic_id)
        break
      case 'savings_contribution':
        result.savings_contributions.add(op.optimistic_id)
        break
      case 'investment_return':
        result.investment_returns.add(op.optimistic_id)
        break
      case 'investment':
        if (op.type.startsWith('investment_return.')) {
          result.investment_returns.add(op.optimistic_id)
        } else {
          result.investments.add(op.optimistic_id)
        }
        break
      // 'user' prefix (user.currencies, user.display_currency) has no optimistic_id — skipped above
    }
  }
  return result
}

/**
 * Deletes all rows in `table` whose primary key is NOT in `protect`.
 * When `protect` is empty, uses the faster `.clear()` path.
 */
async function clearExceptProtected<T, K extends string>(
  table: import('dexie').Table<T, K>,
  protect: Set<string>
): Promise<void> {
  if (protect.size === 0) {
    await table.clear()
    return
  }
  // `where(':id').noneOf(...)` filters by primary key
  await table.where(':id').noneOf([...protect]).delete()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true when the DB has not been hydrated for this userId yet.
 * This is the trigger for the first-boot hydration on OfflineProvider mount.
 */
export async function needsHydration(userId: string): Promise<boolean> {
  const m = await db.meta.get('hydrated_user_id')
  return !m || m.value !== userId
}

/**
 * Returns true when the local Dexie snapshot is older than `thresholdMs`.
 * Used to decide whether to re-pull from the server on tab focus.
 */
export async function isSyncStale(thresholdMs = 2 * 60 * 1000): Promise<boolean> {
  const m = await db.meta.get('last_sync_at')
  if (!m) return true
  return (Date.now() - Number(m.value)) > thresholdMs
}

/**
 * Destructive-replace hydration: drain → fetch → clear (scoped, except
 * protected pending rows) → bulkAdd, all inside a single Dexie rw tx.
 *
 * Guarantees:
 *  - drainQueue() runs first so optimistic rows are reconciled before we wipe
 *  - fetch fails → no Dexie mutations
 *  - rows backed by surviving pending_ops are never deleted
 *  - last_sync_at is bumped ONLY after the Dexie tx commits
 */
export async function hydrateFromServer(userId: string): Promise<void> {
  // STEP 1 — Drain first. drainQueue() never throws; surviving ops become
  // protected IDs in step 3.
  await drainQueue()

  // STEP 2 — Fetch snapshot. Abort BEFORE touching Dexie if this fails.
  const res = await fetch('/api/sync', { cache: 'no-store' })

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('offline-sync:auth-expired'))
    return
  }

  if (!res.ok) {
    throw new Error(`Sync fetch failed: ${res.status}`)
  }

  const snapshot: SyncSnapshot = await res.json()

  // STEP 3 — Collect protected IDs from surviving pending_ops
  // (queued / processing / failed — anything NOT completed).
  // Done outside the main tx: we only read pending_ops here and never
  // mutate it during hydration.
  const survivingOps = await db.pending_ops
    .where('status').anyOf('queued', 'processing', 'failed')
    .toArray()
  const protectedIds = collectProtectedIdsByTable(survivingOps)

  // STEP 4 — One rw transaction over all hydrated tables + meta.
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
      db.investments,
      db.investment_returns,
      db.meta,
    ],
    async () => {
      // 4a. Clear each table except protected IDs.
      await clearExceptProtected(db.transactions,          protectedIds.transactions)
      await clearExceptProtected(db.debts,                 protectedIds.debts)
      await clearExceptProtected(db.debt_payments,         protectedIds.debt_payments)
      await clearExceptProtected(db.presupuestos,          protectedIds.presupuestos)
      await clearExceptProtected(db.presupuesto_items,     protectedIds.presupuesto_items)
      await clearExceptProtected(db.savings_goals,         protectedIds.savings_goals)
      await clearExceptProtected(db.savings_contributions, protectedIds.savings_contributions)
      await clearExceptProtected(db.investments,           protectedIds.investments)
      await clearExceptProtected(db.investment_returns,    protectedIds.investment_returns)

      // 4b. bulkAdd snapshot rows, skipping any IDs that collide with
      // still-pending (protected) rows. If reconcile is working correctly
      // this filter is a no-op for creates; for updates the server snapshot
      // reflects the pre-update state and the pending row is the source of
      // truth until the op drains.
      await db.transactions.bulkAdd(
        snapshot.transactions.filter(r => !protectedIds.transactions.has(r.id))
      )
      await db.debts.bulkAdd(
        snapshot.debts.filter(r => !protectedIds.debts.has(r.id))
      )
      await db.debt_payments.bulkAdd(
        snapshot.debt_payments.filter(r => !protectedIds.debt_payments.has(r.id))
      )
      await db.presupuestos.bulkAdd(
        snapshot.presupuestos.filter(r => !protectedIds.presupuestos.has(r.id))
      )
      await db.presupuesto_items.bulkAdd(
        snapshot.presupuesto_items.filter(r => !protectedIds.presupuesto_items.has(r.id))
      )
      await db.savings_goals.bulkAdd(
        snapshot.savings_goals.filter(r => !protectedIds.savings_goals.has(r.id))
      )
      await db.savings_contributions.bulkAdd(
        snapshot.savings_contributions.filter(r => !protectedIds.savings_contributions.has(r.id))
      )
      await db.investments.bulkAdd(
        snapshot.investments.filter(r => !protectedIds.investments.has(r.id))
      )
      await db.investment_returns.bulkAdd(
        snapshot.investment_returns.filter(r => !protectedIds.investment_returns.has(r.id))
      )

      // 4c. Meta writes — inside the same tx so last_sync_at only bumps
      // when the full clear+bulkAdd succeeds.
      await db.meta.put({ key: 'user_currencies',  value: snapshot.currencies })
      await db.meta.put({ key: 'display_currency', value: snapshot.display_currency })
      await db.meta.put({ key: 'hydrated_user_id', value: userId })
      await db.meta.put({ key: 'last_sync_at',     value: Date.now() })
    }
  )
}
