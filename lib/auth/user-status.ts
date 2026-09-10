import type { UserStatus } from '@/types'

export function isExpired(expires_at: string | null): boolean {
  if (!expires_at) return false
  return new Date(expires_at) < new Date()
}

export function daysUntilExpiry(expires_at: string | null): number | null {
  if (!expires_at) return null
  const diff = new Date(expires_at).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function canAccess(
  status: UserStatus,
  expires_at: string | null,
  isSuperadmin: boolean
): boolean {
  if (isSuperadmin) return true
  if (status !== 'active') return false
  if (isExpired(expires_at)) return false
  return true
}
