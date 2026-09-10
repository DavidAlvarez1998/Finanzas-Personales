'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/auth/session'

export async function createPresupuesto(
  formData: FormData
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const nombre = formData.get('nombre') as string | null
  const totalRaw = formData.get('total') as string | null
  const currency = (formData.get('currency') as string | null) ?? 'COP'

  if (!nombre || !totalRaw) {
    return { error: 'Nombre y total son obligatorios.' }
  }

  const total = parseFloat(totalRaw)
  if (isNaN(total) || total <= 0) {
    return { error: 'El total debe ser un número positivo.' }
  }

  const supabase = createServerClient()
  const { error } = await supabase.from('presupuestos').insert({
    user_id: session.userId,
    nombre: nombre.toUpperCase(),
    total,
    currency,
  })

  if (error) {
    return { error: `Error al guardar: ${error.message}` }
  }

  revalidatePath('/')
}

export async function updatePresupuesto(
  id: string,
  formData: FormData
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const nombre = formData.get('nombre') as string | null
  const totalRaw = formData.get('total') as string | null
  const currency = (formData.get('currency') as string | null) ?? 'COP'

  if (!nombre || !totalRaw) {
    return { error: 'Nombre y total son obligatorios.' }
  }

  const total = parseFloat(totalRaw)
  if (isNaN(total) || total <= 0) {
    return { error: 'El total debe ser un número positivo.' }
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('presupuestos')
    .update({ nombre: nombre.toUpperCase(), total, currency })
    .eq('id', id)
    .eq('user_id', session.userId)

  if (error) {
    return { error: `Error al actualizar: ${error.message}` }
  }

  revalidatePath('/')
}

export async function deletePresupuesto(
  id: string
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const supabase = createServerClient()
  const { error } = await supabase
    .from('presupuestos')
    .delete()
    .eq('id', id)
    .eq('user_id', session.userId)

  if (error) {
    return { error: `Error al eliminar: ${error.message}` }
  }

  revalidatePath('/')
}

export async function createPresupuestoItem(
  presupuestoId: string,
  formData: FormData
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const nombre = formData.get('nombre') as string | null
  const montoRaw = formData.get('monto') as string | null

  if (!nombre || !montoRaw) {
    return { error: 'Nombre y monto son obligatorios.' }
  }

  const monto = parseFloat(montoRaw)
  if (isNaN(monto) || monto <= 0) {
    return { error: 'El monto debe ser un número positivo.' }
  }

  const supabase = createServerClient()

  // Ownership pre-check: verify the parent presupuesto belongs to the current user
  const { data: parent } = await supabase
    .from('presupuestos')
    .select('id')
    .eq('id', presupuestoId)
    .eq('user_id', session.userId)
    .single()

  if (!parent) return { error: 'Presupuesto no encontrado.' }

  const { error } = await supabase.from('presupuesto_items').insert({
    presupuesto_id: presupuestoId,
    nombre: nombre.toUpperCase(),
    monto,
  })

  if (error) {
    return { error: `Error al agregar partida: ${error.message}` }
  }

  revalidatePath('/')
}

export async function updatePresupuestoItem(
  itemId: string,
  formData: FormData
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const nombre = formData.get('nombre') as string | null
  const montoRaw = formData.get('monto') as string | null

  if (!nombre || !montoRaw) {
    return { error: 'Nombre y monto son obligatorios.' }
  }

  const monto = parseFloat(montoRaw)
  if (isNaN(monto) || monto <= 0) {
    return { error: 'El monto debe ser un número positivo.' }
  }

  const supabase = createServerClient()

  // Ownership pre-check via join: verify the item's parent belongs to the current user
  const { data: item } = await supabase
    .from('presupuesto_items')
    .select('id, presupuesto:presupuestos!inner(user_id)')
    .eq('id', itemId)
    .single()

  if (!item || (item as any).presupuesto?.user_id !== session.userId) {
    return { error: 'Partida no encontrada.' }
  }

  const { error } = await supabase
    .from('presupuesto_items')
    .update({ nombre: nombre.toUpperCase(), monto })
    .eq('id', itemId)

  if (error) {
    return { error: `Error al actualizar partida: ${error.message}` }
  }

  revalidatePath('/')
}

export async function deletePresupuestoItem(
  itemId: string
): Promise<{ error: string } | void> {
  const session = await verifySession()

  const supabase = createServerClient()

  // Ownership pre-check via join: verify the item's parent belongs to the current user
  const { data: item } = await supabase
    .from('presupuesto_items')
    .select('id, presupuesto:presupuestos!inner(user_id)')
    .eq('id', itemId)
    .single()

  if (!item || (item as any).presupuesto?.user_id !== session.userId) {
    return { error: 'Partida no encontrada.' }
  }

  const { error } = await supabase
    .from('presupuesto_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    return { error: `Error al eliminar partida: ${error.message}` }
  }

  revalidatePath('/')
}
