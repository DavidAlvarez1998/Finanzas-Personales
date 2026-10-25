/**
 * Offline DAL — mirrors lib/supabase/dal.ts signatures but reads from Dexie.
 * All functions return arrays (never throw on empty).
 * Designed to be called from useLiveQuery.
 */
import { db } from './index'
import type { Transaction, Debt, Presupuesto, SavingsGoal, Investment, AhorroAccount } from '@/types'

export async function getTransactions(userId: string): Promise<Transaction[]> {
  return db.transactions
    .where('user_id')
    .equals(userId)
    .sortBy('date')
    .then(rows => rows.reverse())
}

export async function getDebts(userId: string): Promise<Debt[]> {
  const debts = await db.debts.where('user_id').equals(userId).toArray()
  if (debts.length === 0) return []

  const debtIds = debts.map(d => d.id)
  const allPayments = await db.debt_payments.where('debt_id').anyOf(debtIds).toArray()

  const paymentsByDebt = new Map<string, typeof allPayments>(debts.map(d => [d.id, []]))
  for (const p of allPayments) {
    paymentsByDebt.get(p.debt_id)?.push(p)
  }

  const debtsWithPayments = debts.map(debt => {
    const payments = paymentsByDebt.get(debt.id) ?? []
    const total_paid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const remaining = Math.max(0, Number(debt.amount) - total_paid)
    return { ...debt, payments, total_paid, remaining }
  })

  // Sort by created_at descending (most recent first)
  return debtsWithPayments.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })
}

export async function getPresupuestos(userId: string): Promise<Presupuesto[]> {
  const presupuestos = await db.presupuestos.where('user_id').equals(userId).toArray()
  if (presupuestos.length === 0) return []

  const presupuestoIds = presupuestos.map(p => p.id)
  const allItems = await db.presupuesto_items.where('presupuesto_id').anyOf(presupuestoIds).toArray()

  const itemsByPresupuesto = new Map<string, typeof allItems>(presupuestos.map(p => [p.id, []]))
  for (const item of allItems) {
    itemsByPresupuesto.get(item.presupuesto_id)?.push(item)
  }

  const withItems = presupuestos.map(p => {
    const items = itemsByPresupuesto.get(p.id) ?? []
    const monto_asignado = items.reduce((sum, item) => sum + Number(item.monto), 0)
    const monto_libre = Number(p.total) - monto_asignado
    return { ...p, items, monto_asignado, monto_libre }
  })

  // Sort by created_at descending
  return withItems.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })
}

export async function getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const goals = await db.savings_goals.where('user_id').equals(userId).toArray()
  if (goals.length === 0) return []

  const goalIds = goals.map(g => g.id)
  const allContributions = await db.savings_contributions.where('goal_id').anyOf(goalIds).toArray()

  const contribsByGoal = new Map<string, typeof allContributions>(goals.map(g => [g.id, []]))
  for (const c of allContributions) {
    contribsByGoal.get(c.goal_id)?.push(c)
  }

  const withContributions = goals.map(goal => {
    const contributions = contribsByGoal.get(goal.id) ?? []
    const total_aportado = contributions.reduce((sum, c) => sum + Number(c.monto), 0)
    const remaining = Math.max(0, Number(goal.monto_objetivo) - total_aportado)
    const progress_pct = Number(goal.monto_objetivo) > 0
      ? (total_aportado / Number(goal.monto_objetivo)) * 100
      : 0
    return { ...goal, contributions, total_aportado, remaining, progress_pct }
  })

  // Sort by created_at descending
  return withContributions.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })
}

export async function getInvestments(userId: string): Promise<Investment[]> {
  const invs = await db.investments.where('user_id').equals(userId).toArray()
  if (invs.length === 0) return []

  const invIds = invs.map(inv => inv.id)
  const allReturns = await db.investment_returns.where('investment_id').anyOf(invIds).toArray()

  const returnsByInv = new Map<string, typeof allReturns>(invs.map(inv => [inv.id, []]))
  for (const r of allReturns) {
    returnsByInv.get(r.investment_id)?.push(r)
  }

  const withReturns = invs.map(inv => {
    const returns = (returnsByInv.get(inv.id) ?? []).slice().sort((a, b) => b.fecha.localeCompare(a.fecha))
    const total_retornos = returns.reduce((sum, r) => sum + Number(r.monto), 0)
    const principal = Number(inv.principal)
    return {
      ...inv,
      returns,
      total_retornos,
      roi_pct: principal > 0 ? (total_retornos / principal) * 100 : 0,
    }
  })

  return withReturns.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })
}

export async function getAhorroAccounts(userId: string): Promise<AhorroAccount[]> {
  const accounts = await db.ahorro_accounts.where('user_id').equals(userId).toArray()
  if (accounts.length === 0) return []

  const accountIds = accounts.map(acc => acc.id)
  const allMovimientos = await db.ahorro_movimientos.where('account_id').anyOf(accountIds).toArray()

  const movByAccount = new Map<string, typeof allMovimientos>(accounts.map(acc => [acc.id, []]))
  for (const m of allMovimientos) {
    movByAccount.get(m.account_id)?.push(m)
  }

  const withMovimientos = accounts.map(acc => {
    const movimientos = (movByAccount.get(acc.id) ?? []).slice().sort((a, b) => b.fecha.localeCompare(a.fecha))
    const total_actual = movimientos.reduce((sum, m) => sum + Number(m.monto), 0)
    return { ...acc, movimientos, total_actual }
  })

  return withMovimientos.sort((a, b) => {
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
