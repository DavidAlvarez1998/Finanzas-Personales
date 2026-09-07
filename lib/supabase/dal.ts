import { createServerClient } from './server'
import { verifySession } from '@/lib/auth/session'
import type { Transaction, Debt } from '@/types'

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
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getDebts failed: ${error.message}`)
  return (data ?? []) as Debt[]
}
