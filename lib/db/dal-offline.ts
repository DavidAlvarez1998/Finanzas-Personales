/**
 * Offline DAL — mirrors lib/supabase/dal.ts signatures but reads from Dexie.
 * All functions return arrays (never throw on empty).
 * Designed to be called from useLiveQuery.
 */
import { db } from './index'
import type { Transaction, Debt, Presupuesto, SavingsGoal } from '@/types'

export async function getTransactions(userId: string): Promise<Transaction[]> {
  return db.transactions
    .where('user_id')
    .equals(userId)
    .sortBy('date')
    .then(rows => rows.reverse())
}

export async function getDebts(userId: string): Promise<Debt[]> {
  const debts = await db.debts.where('user_id').equals(userId).toArray()

  const debtsWithPayments = await Promise.all(
    debts.map(async debt => {
      const payments = await db.debt_payments
        .where('debt_id')
        .equals(debt.id)
        .toArray()

      const total_paid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const remaining = Math.max(0, Number(debt.amount) - total_paid)

      return {
        ...debt,
        payments,
        total_paid,
        remaining,
      }
    })
  )

  // Sort by created_at descending (most recent first)
  return debtsWithPayments.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })
}

export async function getPresupuestos(userId: string): Promise<Presupuesto[]> {
  const presupuestos = await db.presupuestos.where('user_id').equals(userId).toArray()

  const withItems = await Promise.all(
    presupuestos.map(async p => {
      const items = await db.presupuesto_items
        .where('presupuesto_id')
        .equals(p.id)
        .toArray()

      const monto_asignado = items.reduce((sum, item) => sum + Number(item.monto), 0)
      const monto_libre = Number(p.total) - monto_asignado

      return {
        ...p,
        items,
        monto_asignado,
        monto_libre,
      }
    })
  )

  // Sort by created_at descending
  return withItems.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })
}

export async function getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const goals = await db.savings_goals.where('user_id').equals(userId).toArray()

  const withContributions = await Promise.all(
    goals.map(async goal => {
      const contributions = await db.savings_contributions
        .where('goal_id')
        .equals(goal.id)
        .toArray()

      const total_aportado = contributions.reduce((sum, c) => sum + Number(c.monto), 0)
      const remaining = Math.max(0, Number(goal.monto_objetivo) - total_aportado)
      const progress_pct = Number(goal.monto_objetivo) > 0
        ? (total_aportado / Number(goal.monto_objetivo)) * 100
        : 0

      return {
        ...goal,
        contributions,
        total_aportado,
        remaining,
        progress_pct,
      }
    })
  )

  // Sort by created_at descending
  return withContributions.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })
}

export async function getUserCurrencies(_userId: string): Promise<string[]> {
  const m = await db.meta.get('user_currencies')
  return (m?.value as string[] | null) ?? []
}

export async function getDisplayCurrency(_userId: string): Promise<string | null> {
  const m = await db.meta.get('display_currency')
  return (m?.value as string | null) ?? null
}

/**
 * Read a cached FX rate from Dexie.
 * Returns null if no cached rate exists.
 * Returns `stale: true` when the cached rate is older than 24 hours.
 */
export async function getExchangeRate(
  from: string,
  to: string
): Promise<{ rate: number; stale: boolean } | null> {
  const pair = `${from}_${to}`
  const cached = await db.fx_rates.get(pair)
  if (!cached) return null
  const STALE_MS = 24 * 60 * 60 * 1000
  return { rate: cached.rate, stale: Date.now() - cached.fetched_at > STALE_MS }
}
