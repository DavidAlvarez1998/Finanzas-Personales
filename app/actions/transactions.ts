'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/auth/session'

export async function createTransaction(
  formData: FormData
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const description = formData.get('description') as string | null
  const date = formData.get('date') as string | null
  const type = formData.get('type') as string | null
  const amountRaw = formData.get('amount') as string | null

  if (!description || !date || !type || !amountRaw) {
    return { error: 'Todos los campos son obligatorios.' }
  }

  const amount = parseFloat(amountRaw)
  if (isNaN(amount) || amount <= 0) {
    return { error: 'El monto debe ser un número positivo.' }
  }

  const income = type === 'income' ? amount : null
  const expense = type === 'expense' ? amount : null

  const supabase = createServerClient()
  const { error } = await supabase.from('transactions').insert({
    user_id: session.userId,
    date,
    description: description.toUpperCase(),
    income,
    expense,
  })

  if (error) {
    return { error: `Error al guardar: ${error.message}` }
  }

  revalidatePath('/')
}

export async function updateTransaction(
  id: string,
  formData: FormData
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const description = formData.get('description') as string | null
  const date = formData.get('date') as string | null
  const type = formData.get('type') as string | null
  const amountRaw = formData.get('amount') as string | null

  if (!description || !date || !type || !amountRaw) {
    return { error: 'Todos los campos son obligatorios.' }
  }

  const amount = parseFloat(amountRaw)
  if (isNaN(amount) || amount <= 0) {
    return { error: 'El monto debe ser un número positivo.' }
  }

  const income = type === 'income' ? amount : null
  const expense = type === 'expense' ? amount : null

  const supabase = createServerClient()
  const { error } = await supabase
    .from('transactions')
    .update({
      date,
      description: description.toUpperCase(),
      income,
      expense,
    })
    .eq('id', id)
    .eq('user_id', session.userId) // RLS + explicit app-layer guard

  if (error) {
    return { error: `Error al actualizar: ${error.message}` }
  }

  revalidatePath('/')
}

export async function deleteTransaction(
  id: string
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const supabase = createServerClient()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', session.userId) // RLS + explicit app-layer guard

  if (error) {
    return { error: `Error al eliminar: ${error.message}` }
  }

  revalidatePath('/')
}
