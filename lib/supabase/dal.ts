import { createServerClient } from './server'
import { verifySession } from '@/lib/auth/session'
import type { Transaction, Debt, DebtPayment, Presupuesto, PresupuestoItem, SavingsGoal, SavingsContribution } from '@/types'

export async function getTransactions(): Promise<Transaction[]> {
  const { userId } = await verifySession()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) throw new Error(`getTransactions failed: ${error.message}`)
  return (data ?? []) as Transaction[]
}

export async function getDebts(): Promise<Debt[]> {
  const { userId } = await verifySession()
  const supabase = createServerClient()

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

export async function getPresupuestos(): Promise<Presupuesto[]> {
  const { userId } = await verifySession()
  const supabase = createServerClient()

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

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const { userId } = await verifySession()
  const supabase = createServerClient()

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
