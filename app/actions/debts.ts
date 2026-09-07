'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/auth/session'

export async function createDebt(
  formData: FormData
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const description = formData.get('description') as string | null
  const amountRaw = formData.get('amount') as string | null
  const currency = (formData.get('currency') as string | null) ?? 'ARS'

  if (!description || !amountRaw) {
    return { error: 'Descripción y monto son obligatorios.' }
  }

  const amount = parseFloat(amountRaw)
  if (isNaN(amount) || amount <= 0) {
    return { error: 'El monto debe ser un número positivo.' }
  }

  const supabase = createServerClient()
  const { error } = await supabase.from('debts').insert({
    user_id: session.userId,
    description: description.toUpperCase(),
    amount,
    currency,
  })

  if (error) {
    return { error: `Error al guardar: ${error.message}` }
  }

  revalidatePath('/')
}

export async function updateDebt(
  id: string,
  formData: FormData
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const description = formData.get('description') as string | null
  const amountRaw = formData.get('amount') as string | null
  const currency = (formData.get('currency') as string | null) ?? 'ARS'

  if (!description || !amountRaw) {
    return { error: 'Descripción y monto son obligatorios.' }
  }

  const amount = parseFloat(amountRaw)
  if (isNaN(amount) || amount <= 0) {
    return { error: 'El monto debe ser un número positivo.' }
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('debts')
    .update({
      description: description.toUpperCase(),
      amount,
      currency,
    })
    .eq('id', id)
    .eq('user_id', session.userId) // RLS + explicit app-layer guard

  if (error) {
    return { error: `Error al actualizar: ${error.message}` }
  }

  revalidatePath('/')
}

export async function deleteDebt(
  id: string
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const supabase = createServerClient()
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', id)
    .eq('user_id', session.userId) // RLS + explicit app-layer guard

  if (error) {
    return { error: `Error al eliminar: ${error.message}` }
  }

  revalidatePath('/')
}
