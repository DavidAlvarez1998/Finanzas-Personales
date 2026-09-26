import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { isExpired } from '@/lib/auth/user-status'
import { readImpersonationPayload } from '@/lib/auth/impersonation'
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

/**
 * Resolves the EFFECTIVE session.
 *
 * When a superadmin is actively impersonating, returns the target user's identity
 * as the active userId (isSuperadmin = false). DAL functions always call this.
 */
export async function verifySession(): Promise<VerifiedSession> {
  const base = await getSession()
  if (!base) redirect('/login')

  // Read full payload so we have targetUserId for the DB check
  const impPayload = await readImpersonationPayload(base)
  // Read context (strips targetUserId) for the VerifiedSession.impersonation field
  const imp = impPayload
    ? {
        adminUserId: impPayload.adminUserId,
        adminEmail: impPayload.adminEmail,
        targetEmail: impPayload.targetEmail,
      }
    : null

  const effectiveUserId = impPayload?.targetUserId ?? base.userId
  const effectiveEmail = impPayload?.targetEmail ?? base.email
  const baseIsSuperadmin = base.email === process.env.SUPERADMIN_EMAIL
  const effectiveIsSuperadmin = impPayload ? false : baseIsSuperadmin

  const supabase = createServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('status, expires_at, email')
    .eq('id', effectiveUserId)
    .single()

  if (!effectiveIsSuperadmin) {
    if (!user || user.status !== 'active') redirect('/blocked')
    if (isExpired(user.expires_at)) redirect('/blocked')
  }

  return {
    userId: effectiveUserId,
    email: effectiveEmail,
    status: user?.status ?? 'pending',
    expires_at: user?.expires_at ?? null,
    isSuperadmin: effectiveIsSuperadmin,
    impersonation: imp ?? undefined,
  }
}

/**
 * Resolves the REAL session — reads only the base session cookie, ignores impersonation.
 * Used exclusively by requireAdmin() so /admin routes always check the real human.
 */
export async function getRealSession(): Promise<VerifiedSession> {
  const base = await getSession()
  if (!base) redirect('/login')

  const supabase = createServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('status, expires_at, email')
    .eq('id', base.userId)
    .single()

  const isSuperadmin = base.email === process.env.SUPERADMIN_EMAIL

  if (!isSuperadmin) {
    if (!user || user.status !== 'active') redirect('/blocked')
    if (isExpired(user.expires_at)) redirect('/blocked')
  }

  return {
    userId: base.userId,
    email: base.email,
    status: user?.status ?? 'pending',
    expires_at: user?.expires_at ?? null,
    isSuperadmin,
    // impersonation intentionally omitted — this function does not know or care
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE)
}
