import { createServerClient } from '@/lib/supabase/server'
import type { AdminUserRow, UserStatus } from '@/types'

export async function getAllUsers(): Promise<AdminUserRow[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, status, expires_at, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getAllUsers failed: ${error.message}`)
  return (data ?? []) as AdminUserRow[]
}

export async function setUserStatus(userId: string, status: UserStatus): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', userId)

  if (error) throw new Error(`setUserStatus failed: ${error.message}`)
}

export async function setUserExpiry(userId: string, expiresAt: Date | null): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('users')
    .update({ expires_at: expiresAt ? expiresAt.toISOString() : null })
    .eq('id', userId)

  if (error) throw new Error(`setUserExpiry failed: ${error.message}`)
}
