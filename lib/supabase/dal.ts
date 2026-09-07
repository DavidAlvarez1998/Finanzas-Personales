import { redirect } from 'next/navigation'
import { createServerClient } from './server'
import type { Transaction, Debt } from '@/types'
import type { Session } from '@supabase/supabase-js'

/**
 * Verifies the current session and returns it.
 * Redirects to /login if there is no valid session.
 * Use this in DAL functions — do NOT call this from Client Components.
 */
export async function getSession(): Promise<Session> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Build a minimal Session-compatible object so callers get user.id
  // The real Session token is managed by @supabase/ssr via cookies.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return session
}

/**
 * Fetches all transactions for the authenticated user, ordered by date desc.
 * Verifies session before querying — never runs a DB query unauthenticated.
 */
export async function getTransactions(): Promise<Transaction[]> {
  const session = await getSession()
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', session.user.id)
    .order('date', { ascending: false })

  if (error) {
    throw new Error(`[DAL] getTransactions failed: ${error.message}`)
  }

  return (data ?? []) as Transaction[]
}

/**
 * Fetches all debts for the authenticated user, ordered by created_at desc.
 * Verifies session before querying — never runs a DB query unauthenticated.
 */
export async function getDebts(): Promise<Debt[]> {
  const session = await getSession()
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`[DAL] getDebts failed: ${error.message}`)
  }

  return (data ?? []) as Debt[]
}
