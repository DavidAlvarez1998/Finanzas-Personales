import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import type { Transaction } from '@/types'

export async function GET(): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const userId = session.userId

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { transactions: (transactions ?? []) as Transaction[] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
