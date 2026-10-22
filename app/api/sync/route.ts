import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import type { Transaction, Debt, DebtPayment, Presupuesto, PresupuestoItem, SavingsGoal, SavingsContribution, Investment, InvestmentReturn, AhorroAccount, AhorroMovimiento } from '@/types'

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
  ahorro_accounts: AhorroAccount[]
  ahorro_movimientos: AhorroMovimiento[]
  currencies: string[]
  display_currency: string | null
}

export async function GET(): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const userId = session.userId

  const [
    { data: transactions, error: txError },
    { data: debts, error: debtsError },
    { data: presupuestos, error: presupError },
    { data: goals, error: goalsError },
    { data: investments, error: investmentsError },
    { data: ahorroAccounts, error: ahorroAccountsError },
    { data: userRow, error: userError },
  ] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('debts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('presupuestos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('savings_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('investments').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('ahorro_accounts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('users').select('currencies, display_currency').eq('id', userId).single(),
  ])

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })
  if (debtsError) return NextResponse.json({ error: debtsError.message }, { status: 500 })
  if (presupError) return NextResponse.json({ error: presupError.message }, { status: 500 })
  if (goalsError) return NextResponse.json({ error: goalsError.message }, { status: 500 })
  if (investmentsError) return NextResponse.json({ error: investmentsError.message }, { status: 500 })
  if (ahorroAccountsError) return NextResponse.json({ error: ahorroAccountsError.message }, { status: 500 })
  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 })

  const debtIds = (debts ?? []).map(d => d.id)
  const presupuestoIds = (presupuestos ?? []).map(p => p.id)
  const goalIds = (goals ?? []).map(g => g.id)
  const investmentIds = (investments ?? []).map(i => i.id)
  const ahorroAccountIds = (ahorroAccounts ?? []).map(a => a.id)

  const [
    { data: debtPayments, error: paymentsError },
    { data: presupuestoItems, error: itemsError },
    { data: contributions, error: contribError },
    { data: investmentReturns, error: returnsError },
    { data: ahorroMovimientos, error: ahorroMovimientosError },
  ] = await Promise.all([
    debtIds.length > 0
      ? supabase.from('debt_payments').select('*').in('debt_id', debtIds)
      : Promise.resolve({ data: [], error: null }),
    presupuestoIds.length > 0
      ? supabase.from('presupuesto_items').select('*').in('presupuesto_id', presupuestoIds)
      : Promise.resolve({ data: [], error: null }),
    goalIds.length > 0
      ? supabase.from('savings_contributions').select('*').in('goal_id', goalIds)
      : Promise.resolve({ data: [], error: null }),
    investmentIds.length > 0
      ? supabase.from('investment_returns').select('*').in('investment_id', investmentIds)
      : Promise.resolve({ data: [], error: null }),
    ahorroAccountIds.length > 0
      ? supabase.from('ahorro_movimientos').select('*').in('account_id', ahorroAccountIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (paymentsError) return NextResponse.json({ error: paymentsError.message }, { status: 500 })
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
  if (contribError) return NextResponse.json({ error: contribError.message }, { status: 500 })
  if (returnsError) return NextResponse.json({ error: returnsError.message }, { status: 500 })
  if (ahorroMovimientosError) return NextResponse.json({ error: ahorroMovimientosError.message }, { status: 500 })

  const snapshot: SyncSnapshot = {
    transactions: (transactions ?? []) as Transaction[],
    debts: (debts ?? []) as Debt[],
    debt_payments: (debtPayments ?? []) as DebtPayment[],
    presupuestos: (presupuestos ?? []) as Presupuesto[],
    presupuesto_items: (presupuestoItems ?? []) as PresupuestoItem[],
    savings_goals: (goals ?? []) as SavingsGoal[],
    savings_contributions: (contributions ?? []) as SavingsContribution[],
    investments: (investments ?? []) as Investment[],
    investment_returns: (investmentReturns ?? []) as InvestmentReturn[],
    ahorro_accounts: (ahorroAccounts ?? []) as AhorroAccount[],
    ahorro_movimientos: (ahorroMovimientos ?? []) as AhorroMovimiento[],
    currencies: (userRow?.currencies as string[] | null) ?? [],
    display_currency: (userRow?.display_currency as string | null) ?? null,
  }

  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } })
}
