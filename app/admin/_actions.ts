'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import { setUserStatus, setUserExpiry } from '@/lib/supabase/admin-dal'

export async function activateUser(userId: string): Promise<void> {
  await requireAdmin()
  await setUserStatus(userId, 'active')
  revalidatePath('/admin')
}

export async function deactivateUser(userId: string): Promise<void> {
  await requireAdmin()
  await setUserStatus(userId, 'inactive')
  revalidatePath('/admin')
}

export async function setExpiry(userId: string, formData: FormData): Promise<void> {
  await requireAdmin()
  const date = formData.get('date') as string | null
  if (!date) return
  await setUserExpiry(userId, new Date(date))
  revalidatePath('/admin')
  revalidatePath('/', 'layout')
}

export async function clearExpiry(userId: string): Promise<void> {
  await requireAdmin()
  await setUserExpiry(userId, null)
  revalidatePath('/admin')
  revalidatePath('/', 'layout')
}
