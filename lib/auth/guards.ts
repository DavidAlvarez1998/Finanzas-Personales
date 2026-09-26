import { redirect } from 'next/navigation'
import { getRealSession } from './session'
import type { VerifiedSession } from '@/types'

export async function requireAdmin(): Promise<VerifiedSession> {
  const session = await getRealSession()
  if (!session.isSuperadmin) redirect('/')
  return session
}
