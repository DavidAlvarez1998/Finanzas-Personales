'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/auth/session'
import type { AhorroAccount, AhorroMovimiento, AhorroAccountStatus } from '@/types'

export async function createAhorroAccount(
  formData: FormData
): Promise<{ error: string } | { row: AhorroAccount }> {
  const session = await verifySession()

  const clientId = (formData.get('id') as string | null) || undefined
  const nombreRaw = (formData.get('nombre') as string | null)?.trim() ?? ''
  const currency = (formData.get('currency') as string | null) ?? 'COP'

  if (!nombreRaw) return { error: 'nombre is required' }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('ahorro_accounts')
    .upsert({
      ...(clientId ? { id: clientId } : {}),
      user_id: session.userId,
      nombre: nombreRaw.toUpperCase(),
      currency,
      status: 'active',
    }, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) return { error: `Error al guardar cuenta: ${error.message}` }

  revalidatePath('/')
  return { row: data as AhorroAccount }
}

export async function updateAhorroAccount(
  id: string,
  formData: FormData
): Promise<{ error: string } | { row: AhorroAccount }> {
  const session = await verifySession()

  const nombreRaw = (formData.get('nombre') as string | null)?.trim() ?? ''
  const currency = (formData.get('currency') as string | null) ?? 'COP'

  if (!nombreRaw) return { error: 'nombre is required' }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('ahorro_accounts')
    .update({
      nombre: nombreRaw.toUpperCase(),
      currency,
    })
    .eq('id', id)
    .eq('user_id', session.userId)
    .select('*')
    .single()

  if (error) return { error: `Error al actualizar cuenta: ${error.message}` }
  if (!data) return { error: 'Cuenta no encontrada' }

  revalidatePath('/')
  return { row: data as AhorroAccount }
}

export async function deleteAhorroAccount(
  id: string
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const supabase = createServerClient()
  const { error } = await supabase
    .from('ahorro_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', session.userId)

  if (error) return { error: `Error al eliminar cuenta: ${error.message}` }

  revalidatePath('/')
}

export async function updateAhorroAccountStatus(
  id: string,
  status: AhorroAccountStatus
): Promise<{ error: string } | { row: AhorroAccount }> {
  const session = await verifySession()

  if (status !== 'active' && status !== 'archived') {
    return { error: 'Invalid status' }
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('ahorro_accounts')
    .update({ status })
    .eq('id', id)
    .eq('user_id', session.userId)
    .select('*')
    .single()

  if (error) return { error: `Error al actualizar estado: ${error.message}` }

  revalidatePath('/')
  return { row: data as AhorroAccount }
}

export async function addMovimiento(
  accountId: string,
  formData: FormData
): Promise<{ error: string } | { row: AhorroMovimiento }> {
  const session = await verifySession()

  const supabase = createServerClient()

  // Verify parent account ownership
  const { data: account } = await supabase
    .from('ahorro_accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', session.userId)
    .single()

  if (!account) return { error: 'Cuenta no encontrada.' }

  const clientId = (formData.get('id') as string | null) || undefined
  const montoRaw = formData.get('monto') as string | null
  const monto = parseFloat(montoRaw ?? '')
  // Reject NaN or zero — negative values are valid (withdrawals)
  if (isNaN(monto) || monto === 0) return { error: 'monto must be a non-zero number' }

  const fecha =
    (formData.get('fecha') as string | null) ||
    new Date().toISOString().split('T')[0]
  const nota = (formData.get('nota') as string | null) || null

  const { data, error: insertError } = await supabase
    .from('ahorro_movimientos')
    .upsert({
      ...(clientId ? { id: clientId } : {}),
      account_id: accountId,
      monto,
      fecha,
      nota,
    }, { onConflict: 'id' })
    .select('*')
    .single()

  if (insertError) return { error: `Error al agregar movimiento: ${insertError.message}` }

  // CRITICAL: Do NOT re-fetch or call any auto-complete helper.
  // Ahorros has no completion state — this is intentional.

  revalidatePath('/')
  return { row: data as AhorroMovimiento }
}

export async function deleteMovimiento(
  id: string
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const supabase = createServerClient()

  // JOIN-lookup ownership via parent account
  const { data: movimiento } = await supabase
    .from('ahorro_movimientos')
    .select('id, account_id, ahorro_accounts!inner(user_id)')
    .eq('id', id)
    .single()

  if (
    !movimiento ||
    (movimiento.ahorro_accounts as any)?.user_id !== session.userId
  ) {
    return { error: 'Movimiento no encontrado.' }
  }

  const { error } = await supabase
    .from('ahorro_movimientos')
    .delete()
    .eq('id', id)

  if (error) return { error: `Error al eliminar movimiento: ${error.message}` }

  revalidatePath('/')
}
