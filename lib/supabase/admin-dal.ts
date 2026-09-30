import { createServerClient } from '@/lib/supabase/server'
import type { AdminUserRow, UserStatus } from '@/types'

// ---------------------------------------------------------------------------
// Password-reset helpers
// ---------------------------------------------------------------------------

export async function getUserByEmail(
  email: string
): Promise<{ id: string; email: string; status: UserStatus; expires_at: string | null } | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, status, expires_at')
    .eq('email', email)
    .single()

  if (error) return null
  return data as { id: string; email: string; status: UserStatus; expires_at: string | null }
}

export async function setResetToken(
  userId: string,
  hashedToken: string,
  expiresAt: Date
): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('users')
    .update({
      reset_token: hashedToken,
      reset_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', userId)

  if (error) throw new Error(`setResetToken failed: ${error.message}`)
}

export async function getUserByResetToken(
  hashedToken: string
): Promise<{ id: string; email: string; reset_token_expires_at: string } | null> {
  const supabase = createServerClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, reset_token_expires_at')
    .eq('reset_token', hashedToken)
    .gt('reset_token_expires_at', now)
    .single()

  if (error) return null
  return data as { id: string; email: string; reset_token_expires_at: string }
}

export async function clearResetToken(userId: string): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('users')
    .update({ reset_token: null, reset_token_expires_at: null })
    .eq('id', userId)

  if (error) throw new Error(`clearResetToken failed: ${error.message}`)
}

export async function updatePasswordHash(
  userId: string,
  newHash: string
): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('users')
    .update({ password_hash: newHash })
    .eq('id', userId)

  if (error) throw new Error(`updatePasswordHash failed: ${error.message}`)
}

export async function getUserById(userId: string): Promise<AdminUserRow | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, status, expires_at, created_at')
    .eq('id', userId)
    .single()

  if (error) return null
  return data as AdminUserRow
}

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
