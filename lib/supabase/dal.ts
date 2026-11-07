import { unstable_cache } from 'next/cache'
import { createServerClient } from './server'
import { CACHE_TAGS, tagFor } from '@/lib/cache/tags'
import type { Transaction, Debt, DebtPayment, Presupuesto, PresupuestoItem, SavingsGoal, SavingsContribution, Investment, InvestmentReturn, AhorroAccount, AhorroMovimiento } from '@/types'

type SupabaseClient = ReturnType<typeof createServerClient>

// ─── Transactions ────────────────────────────────────────────────────────────

async function _getTransactionsRaw(supabase: SupabaseClient, userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, description, date, income, expense, currency, category, created_at')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) throw new Error(`getTransactions failed: ${error.message}`)
  return (data ?? []) as Transaction[]
}

export const getTransactions = (supabase: SupabaseClient, userId: string) =>
  unstable_cache(
    () => _getTransactionsRaw(supabase, userId),
    [CACHE_TAGS.transactions, userId],
    { tags: [tagFor('transactions', userId)] }
  )()

// ─── Debts ───────────────────────────────────────────────────────────────────

async function _getDebtsRaw(supabase: SupabaseClient, userId: string): Promise<Debt[]> {
  const { data, error } = await supabase
    .from('debts')
    .select('*, debt_payments(id, amount, paid_at, note, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getDebts failed: ${error.message}`)

  return ((data ?? []) as any[]).map(d => {
    const payments: DebtPayment[] = d.debt_payments ?? []
    const total_paid = payments.reduce((s: number, p: DebtPayment) => s + p.amount, 0)
    return {
      ...d,
      payments,
      total_paid,
      remaining: d.amount - total_paid,
    } as Debt
  })
}

export const getDebts = (supabase: SupabaseClient, userId: string) =>
  unstable_cache(
    () => _getDebtsRaw(supabase, userId),
    [CACHE_TAGS.debts, userId],
    { tags: [tagFor('debts', userId)] }
  )()

// ─── Presupuestos ─────────────────────────────────────────────────────────────

async function _getPresupuestosRaw(supabase: SupabaseClient, userId: string): Promise<Presupuesto[]> {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('*, presupuesto_items(id, presupuesto_id, nombre, monto, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getPresupuestos failed: ${error.message}`)

  return ((data ?? []) as any[]).map(p => {
    const items: PresupuestoItem[] = p.presupuesto_items ?? []
    const monto_asignado = items.reduce((s, it) => s + it.monto, 0)
    return {
      ...p,
      items,
      monto_asignado,
      monto_libre: p.total - monto_asignado,
    } as Presupuesto
  })
}

export const getPresupuestos = (supabase: SupabaseClient, userId: string) =>
  unstable_cache(
    () => _getPresupuestosRaw(supabase, userId),
    [CACHE_TAGS.presupuestos, userId],
    { tags: [tagFor('presupuestos', userId)] }
  )()

// ─── User Settings ────────────────────────────────────────────────────────────

export type UserSettings = {
  currencies: string[]
  displayCurrency: string | null
}

async function _getUserSettingsRaw(supabase: SupabaseClient, userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('users')
    .select('currencies, display_currency')
    .eq('id', userId)
    .single()
  if (error) throw new Error(`getUserSettings failed: ${error.message}`)
  return {
    currencies: (data?.currencies as string[] | null) ?? [],
    displayCurrency: (data?.display_currency as string | null) ?? null,
  }
}

export const getUserSettings = (supabase: SupabaseClient, userId: string) =>
  unstable_cache(
    () => _getUserSettingsRaw(supabase, userId),
    [CACHE_TAGS.userSettings, userId],
    { tags: [tagFor('userSettings', userId)] }
  )()

// ─── Investments ──────────────────────────────────────────────────────────────

async function _getInvestmentsRaw(supabase: SupabaseClient, userId: string): Promise<Investment[]> {
  const { data, error } = await supabase
    .from('investments')
    .select('*, investment_returns(id, investment_id, monto, fecha, nota, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getInvestments failed: ${error.message}`)

  return ((data ?? []) as any[]).map(inv => {
    const returns: InvestmentReturn[] = (inv.investment_returns ?? [])
      .slice()
      .sort((a: InvestmentReturn, b: InvestmentReturn) => b.fecha.localeCompare(a.fecha))
    const principal = Number(inv.principal)
    const total_retornos = returns.reduce((s, r) => s + Number(r.monto), 0)
    return {
      ...inv,
      principal,
      returns,
      total_retornos,
      roi_pct: principal > 0 ? (total_retornos / principal) * 100 : 0,
    } as Investment
  })
}

export const getInvestments = (supabase: SupabaseClient, userId: string) =>
  unstable_cache(
    () => _getInvestmentsRaw(supabase, userId),
    [CACHE_TAGS.investments, userId],
    { tags: [tagFor('investments', userId)] }
  )()

// ─── Ahorro Accounts ──────────────────────────────────────────────────────────

async function _getAhorroAccountsRaw(supabase: SupabaseClient, userId: string): Promise<AhorroAccount[]> {
  const { data, error } = await supabase
    .from('ahorro_accounts')
    .select('*, ahorro_movimientos(id, account_id, monto, fecha, nota, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getAhorroAccounts failed: ${error.message}`)

  return ((data ?? []) as any[]).map(a => {
    const movimientos: AhorroMovimiento[] = (a.ahorro_movimientos ?? [])
      .slice()
      .sort((x: AhorroMovimiento, y: AhorroMovimiento) =>
        y.fecha.localeCompare(x.fecha)
      )
    const total_actual = movimientos.reduce((s, m) => s + Number(m.monto), 0)
    return {
      ...a,
      movimientos,
      total_actual,
    } as AhorroAccount
  })
}

export const getAhorroAccounts = (supabase: SupabaseClient, userId: string) =>
  unstable_cache(
    () => _getAhorroAccountsRaw(supabase, userId),
    [CACHE_TAGS.ahorros, userId],
    { tags: [tagFor('ahorros', userId)] }
  )()

// ─── Savings Goals ────────────────────────────────────────────────────────────

async function _getSavingsGoalsRaw(supabase: SupabaseClient, userId: string): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*, savings_contributions(id, goal_id, monto, fecha, nota, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getSavingsGoals failed: ${error.message}`)

  return ((data ?? []) as any[]).map(g => {
    const contributions: SavingsContribution[] = (g.savings_contributions ?? [])
      .slice()
      .sort((a: SavingsContribution, b: SavingsContribution) =>
        b.fecha.localeCompare(a.fecha)
      )
    const total_aportado = contributions.reduce((s, c) => s + Number(c.monto), 0)
    const monto_objetivo = Number(g.monto_objetivo)
    return {
      ...g,
      monto_objetivo,
      contributions,
      total_aportado,
      remaining: Math.max(0, monto_objetivo - total_aportado),
      progress_pct: monto_objetivo > 0 ? (total_aportado / monto_objetivo) * 100 : 0,
    } as SavingsGoal
  })
}

export const getSavingsGoals = (supabase: SupabaseClient, userId: string) =>
  unstable_cache(
    () => _getSavingsGoalsRaw(supabase, userId),
    [CACHE_TAGS.savings, userId],
    { tags: [tagFor('savings', userId)] }
  )()
