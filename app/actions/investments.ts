'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/auth/session'
import type { Investment, InvestmentReturn, InvestmentStatus, ReturnPeriod } from '@/types'

const VALID_PERIODS: ReturnPeriod[] = ['monthly', 'quarterly', 'annual', 'one_time', 'custom']
const VALID_STATUSES: InvestmentStatus[] = ['active', 'completed', 'withdrawn']

export async function createInvestment(
  formData: FormData
): Promise<{ error: string } | { row: Investment }> {
  const session = await verifySession()

  const clientId = (formData.get('id') as string | null) || undefined
  const nombreRaw = (formData.get('nombre') as string | null)?.trim() ?? ''
  const principalRaw = formData.get('principal') as string | null
  const currency = (formData.get('currency') as string | null) ?? 'COP'
  const fecha_inicio =
    (formData.get('fecha_inicio') as string | null) ||
    new Date().toISOString().split('T')[0]
  const fecha_vencimiento = (formData.get('fecha_vencimiento') as string | null) || null
  const tasaRaw = formData.get('tasa_esperada') as string | null
  const periodo_retorno =
    ((formData.get('periodo_retorno') as string | null) as ReturnPeriod | null) ?? 'monthly'
  const descripcion = (formData.get('descripcion') as string | null) || null

  if (!nombreRaw) return { error: 'nombre is required' }

  const principal = parseFloat(principalRaw ?? '')
  if (isNaN(principal) || principal <= 0) {
    return { error: 'principal must be > 0' }
  }

  if (!VALID_PERIODS.includes(periodo_retorno)) {
    return { error: `periodo_retorno must be one of: ${VALID_PERIODS.join(', ')}` }
  }

  let tasa_esperada: number | null = null
  if (tasaRaw != null && tasaRaw !== '') {
    tasa_esperada = parseFloat(tasaRaw)
    if (isNaN(tasa_esperada) || tasa_esperada < 0) {
      return { error: 'tasa_esperada must be >= 0' }
    }
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('investments')
    .upsert(
      {
        ...(clientId ? { id: clientId } : {}),
        user_id: session.userId,
        nombre: nombreRaw.toUpperCase(),
        descripcion,
        principal,
        currency,
        fecha_inicio,
        fecha_vencimiento,
        tasa_esperada,
        periodo_retorno,
        status: 'active',
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single()

  if (error) return { error: `Error al guardar inversión: ${error.message}` }

  revalidatePath('/')
  return { row: data as Investment }
}

export async function updateInvestment(
  id: string,
  formData: FormData
): Promise<{ error: string } | { row: Investment }> {
  const session = await verifySession()

  const nombreRaw = (formData.get('nombre') as string | null)?.trim() ?? ''
  const principalRaw = formData.get('principal') as string | null
  const currency = (formData.get('currency') as string | null) ?? 'COP'
  const fecha_inicio =
    (formData.get('fecha_inicio') as string | null) ||
    new Date().toISOString().split('T')[0]
  const fecha_vencimiento = (formData.get('fecha_vencimiento') as string | null) || null
  const tasaRaw = formData.get('tasa_esperada') as string | null
  const periodo_retorno =
    ((formData.get('periodo_retorno') as string | null) as ReturnPeriod | null) ?? 'monthly'
  const descripcion = (formData.get('descripcion') as string | null) || null

  if (!nombreRaw) return { error: 'nombre is required' }

  const principal = parseFloat(principalRaw ?? '')
  if (isNaN(principal) || principal <= 0) {
    return { error: 'principal must be > 0' }
  }

  if (!VALID_PERIODS.includes(periodo_retorno)) {
    return { error: `periodo_retorno must be one of: ${VALID_PERIODS.join(', ')}` }
  }

  let tasa_esperada: number | null = null
  if (tasaRaw != null && tasaRaw !== '') {
    tasa_esperada = parseFloat(tasaRaw)
    if (isNaN(tasa_esperada) || tasa_esperada < 0) {
      return { error: 'tasa_esperada must be >= 0' }
    }
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('investments')
    .update({
      nombre: nombreRaw.toUpperCase(),
      descripcion,
      principal,
      currency,
      fecha_inicio,
      fecha_vencimiento,
      tasa_esperada,
      periodo_retorno,
    })
    .eq('id', id)
    .eq('user_id', session.userId)
    .select('*')
    .single()

  if (error) return { error: `Error al actualizar inversión: ${error.message}` }
  if (!data) return { error: 'Investment not found' }

  revalidatePath('/')
  return { row: data as Investment }
}

export async function deleteInvestment(
  id: string
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const supabase = createServerClient()
  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', id)
    .eq('user_id', session.userId)

  if (error) return { error: `Error al eliminar inversión: ${error.message}` }

  revalidatePath('/')
}

export async function updateInvestmentStatus(
  id: string,
  status: InvestmentStatus
): Promise<{ error: string } | { row: Investment }> {
  const session = await verifySession()

  // 'active' is the starting state only — no back-transitions allowed
  if (!VALID_STATUSES.includes(status) || status === 'active') {
    return { error: 'Invalid status. Must be completed or withdrawn.' }
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('investments')
    .update({ status })
    .eq('id', id)
    .eq('user_id', session.userId)
    .select('*')
    .single()

  if (error) return { error: `Error al actualizar estado: ${error.message}` }

  revalidatePath('/')
  return { row: data as Investment }
}

export async function addReturn(
  investmentId: string,
  formData: FormData
): Promise<{ error: string } | { row: InvestmentReturn }> {
  const session = await verifySession()

  const supabase = createServerClient()

  // Verify parent investment ownership
  const { data: investment } = await supabase
    .from('investments')
    .select('id')
    .eq('id', investmentId)
    .eq('user_id', session.userId)
    .single()

  if (!investment) return { error: 'Inversión no encontrada.' }

  const clientId = (formData.get('id') as string | null) || undefined
  const montoRaw = formData.get('monto') as string | null
  const monto = parseFloat(montoRaw ?? '')
  if (isNaN(monto) || monto <= 0) return { error: 'monto must be > 0' }

  const fecha =
    (formData.get('fecha') as string | null) ||
    new Date().toISOString().split('T')[0]
  const nota = (formData.get('nota') as string | null) || null

  const { data, error: insertError } = await supabase
    .from('investment_returns')
    .upsert(
      {
        ...(clientId ? { id: clientId } : {}),
        investment_id: investmentId,
        monto,
        fecha,
        nota,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single()

  if (insertError) return { error: `Error al agregar retorno: ${insertError.message}` }

  revalidatePath('/')
  return { row: data as InvestmentReturn }
}

export async function deleteReturn(
  id: string
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const supabase = createServerClient()

  // JOIN-lookup ownership via parent investment
  const { data: returnRecord } = await supabase
    .from('investment_returns')
    .select('id, investment_id, investments!inner(user_id)')
    .eq('id', id)
    .single()

  if (
    !returnRecord ||
    (returnRecord.investments as any)?.user_id !== session.userId
  ) {
    return { error: 'Retorno no encontrado.' }
  }

  const { error } = await supabase
    .from('investment_returns')
    .delete()
    .eq('id', id)

  if (error) return { error: `Error al eliminar retorno: ${error.message}` }

  revalidatePath('/')
}
