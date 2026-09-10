'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/auth/session'
import type { SavingsGoalStatus } from '@/types'

export async function createSavingsGoal(
  formData: FormData
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const nombreRaw = (formData.get('nombre') as string | null)?.trim() ?? ''
  const montoRaw = formData.get('monto_objetivo') as string | null
  const currency = (formData.get('currency') as string | null) ?? 'COP'

  if (!nombreRaw) return { error: 'nombre is required' }

  const monto_objetivo = parseFloat(montoRaw ?? '')
  if (isNaN(monto_objetivo) || monto_objetivo <= 0) {
    return { error: 'monto_objetivo must be > 0' }
  }

  const supabase = createServerClient()
  const { error } = await supabase.from('savings_goals').insert({
    user_id: session.userId,
    nombre: nombreRaw.toUpperCase(),
    monto_objetivo,
    currency,
    status: 'active',
  })

  if (error) return { error: `Error al guardar meta: ${error.message}` }

  revalidatePath('/')
}

export async function updateSavingsGoal(
  id: string,
  formData: FormData
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const nombreRaw = (formData.get('nombre') as string | null)?.trim() ?? ''
  const montoRaw = formData.get('monto_objetivo') as string | null
  const currency = (formData.get('currency') as string | null) ?? 'COP'

  if (!nombreRaw) return { error: 'nombre is required' }

  const monto_objetivo = parseFloat(montoRaw ?? '')
  if (isNaN(monto_objetivo) || monto_objetivo <= 0) {
    return { error: 'monto_objetivo must be > 0' }
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('savings_goals')
    .update({
      nombre: nombreRaw.toUpperCase(),
      monto_objetivo,
      currency,
    })
    .eq('id', id)
    .eq('user_id', session.userId)
    .select('id')

  if (error) return { error: `Error al actualizar meta: ${error.message}` }
  if (!data || data.length === 0) return { error: 'Goal not found' }

  revalidatePath('/')
}

export async function deleteSavingsGoal(
  id: string
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const supabase = createServerClient()
  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', session.userId)

  if (error) return { error: `Error al eliminar meta: ${error.message}` }

  revalidatePath('/')
}

export async function updateGoalStatus(
  id: string,
  status: SavingsGoalStatus
): Promise<{ error: string } | void> {
  const session = await verifySession()

  // 'completed' is auto-set only — block manual forcing
  if (status !== 'active' && status !== 'paused') {
    return { error: 'Invalid status' }
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('savings_goals')
    .update({ status })
    .eq('id', id)
    .eq('user_id', session.userId)

  if (error) return { error: `Error al actualizar estado: ${error.message}` }

  revalidatePath('/')
}

export async function addContribution(
  goalId: string,
  formData: FormData
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const supabase = createServerClient()

  // Verify parent goal ownership
  const { data: goal } = await supabase
    .from('savings_goals')
    .select('id, monto_objetivo, status')
    .eq('id', goalId)
    .eq('user_id', session.userId)
    .single()

  if (!goal) return { error: 'Meta no encontrada.' }

  const montoRaw = formData.get('monto') as string | null
  const monto = parseFloat(montoRaw ?? '')
  if (isNaN(monto) || monto <= 0) return { error: 'monto must be > 0' }

  const fecha =
    (formData.get('fecha') as string | null) ||
    new Date().toISOString().split('T')[0]
  const nota = (formData.get('nota') as string | null) || null

  const { error: insertError } = await supabase
    .from('savings_contributions')
    .insert({ goal_id: goalId, monto, fecha, nota })

  if (insertError) return { error: `Error al agregar aporte: ${insertError.message}` }

  // Re-fetch total and auto-complete if threshold reached
  const { data: contributions } = await supabase
    .from('savings_contributions')
    .select('monto')
    .eq('goal_id', goalId)

  const new_total = (contributions ?? []).reduce(
    (s, c) => s + Number(c.monto),
    0
  )

  if (new_total >= Number(goal.monto_objetivo) && goal.status === 'active') {
    await supabase
      .from('savings_goals')
      .update({ status: 'completed' })
      .eq('id', goalId)
      .eq('user_id', session.userId)
  }

  revalidatePath('/')
}

export async function deleteContribution(
  id: string
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const supabase = createServerClient()

  // JOIN-lookup ownership via parent goal
  const { data: contribution } = await supabase
    .from('savings_contributions')
    .select('id, goal_id, savings_goals!inner(user_id)')
    .eq('id', id)
    .single()

  if (
    !contribution ||
    (contribution.savings_goals as any)?.user_id !== session.userId
  ) {
    return { error: 'Aporte no encontrado.' }
  }

  const { error } = await supabase
    .from('savings_contributions')
    .delete()
    .eq('id', id)

  if (error) return { error: `Error al eliminar aporte: ${error.message}` }

  // No auto-revert of goal status on contribution delete (by design)

  revalidatePath('/')
}
