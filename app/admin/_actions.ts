'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/auth/guards'
import { setUserStatus, setUserExpiry, getUserById } from '@/lib/supabase/admin-dal'
import {
  signImpersonationToken,
  deleteImpersonationSession,
  IMPERSONATION_COOKIE,
  IMPERSONATION_TTL_SECONDS,
} from '@/lib/auth/impersonation'
import { isExpired } from '@/lib/auth/user-status'

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

export async function startImpersonation(targetUserId: string): Promise<void> {
  const admin = await requireAdmin()

  const targetUser = await getUserById(targetUserId)
  if (!targetUser) throw new Error('Target user not found')
  if (targetUser.status !== 'active') throw new Error('Target user is not active')
  if (isExpired(targetUser.expires_at)) throw new Error('Target user account is expired')
  if (targetUser.email === process.env.SUPERADMIN_EMAIL) {
    throw new Error('Cannot impersonate the superadmin account')
  }

  const token = await signImpersonationToken({
    targetUserId: targetUser.id,
    targetEmail: targetUser.email,
    adminUserId: admin.userId,
    adminEmail: admin.email,
  })

  const jar = await cookies()
  jar.set(IMPERSONATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: IMPERSONATION_TTL_SECONDS,
    path: '/',
  })

  // AUDIT HOOK: await logImpersonationEvent({ type: 'started', adminUserId: admin.userId, targetUserId, at: new Date() })

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function stopImpersonation(): Promise<void> {
  await requireAdmin()

  // AUDIT HOOK: await logImpersonationEvent({ type: 'stopped', ... })

  await deleteImpersonationSession()
  revalidatePath('/', 'layout')
  redirect('/')
}
