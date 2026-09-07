import { createServerClient } from './server'
import { verifySession } from '@/lib/auth/session'
import type { Transaction, Debt, DebtPayment } from '@/types'

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
