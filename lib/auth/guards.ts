import { redirect } from 'next/navigation'
import { verifySession } from './session'
import type { VerifiedSession } from '@/types'

export async function requireAdmin(): Promise<VerifiedSession> {
  const session = await verifySession()
  if (!session.isSuperadmin) redirect('/')
  return session
}
