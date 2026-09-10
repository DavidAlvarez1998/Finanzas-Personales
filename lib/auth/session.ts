import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { isExpired } from '@/lib/auth/user-status'
import type { VerifiedSession } from '@/types'

const COOKIE = 'session'

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET env var is missing. Add it to .env.local.')
  return new TextEncoder().encode(secret)
}

export type SessionPayload = { userId: string; email: string }

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret())

  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as SessionPayload
  } catch {
    return null
  }
}

export async function verifySession(): Promise<VerifiedSession> {
  const session = await getSession()
  if (!session) redirect('/login')

  const supabase = createServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('status, expires_at, email')
    .eq('id', session.userId)
    .single()

  const isSuperadmin = session.email === process.env.SUPERADMIN_EMAIL

  if (!isSuperadmin) {
    if (!user || user.status !== 'active') redirect('/blocked')
    if (isExpired(user.expires_at)) redirect('/blocked')
  }

  return {
    userId: session.userId,
    email: session.email,
    status: user?.status ?? 'pending',
    expires_at: user?.expires_at ?? null,
    isSuperadmin,
  } as VerifiedSession
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE)
}
