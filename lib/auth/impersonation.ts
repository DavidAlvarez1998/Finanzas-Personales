import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { ImpersonationContext } from '@/types'
import type { SessionPayload } from './session'

export const IMPERSONATION_COOKIE = 'impersonation'
export const IMPERSONATION_TTL_SECONDS = 60 * 60 // 1h

export interface ImpersonationPayload {
  targetUserId: string
  targetEmail: string
  adminUserId: string
  adminEmail: string
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET env var is missing.')
  return new TextEncoder().encode(secret)
}

export async function signImpersonationToken(p: ImpersonationPayload): Promise<string> {
  return new SignJWT(p as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getSecret())
}

export async function verifyImpersonationToken(token: string): Promise<ImpersonationPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as ImpersonationPayload
  } catch {
    return null
  }
}

/**
 * Reads the impersonation cookie IF AND ONLY IF baseSession belongs to the superadmin.
 *
 * - If baseSession is null → returns null
 * - If baseSession.email !== SUPERADMIN_EMAIL → deletes cookie (R2), returns null
 * - If cookie missing or invalid/expired → returns null
 * - Otherwise returns ImpersonationContext (adminUserId, adminEmail, targetEmail)
 */
export async function readImpersonationContext(
  baseSession: SessionPayload | null
): Promise<ImpersonationContext | null> {
  const payload = await readImpersonationPayload(baseSession)
  if (!payload) return null
  return {
    adminUserId: payload.adminUserId,
    adminEmail: payload.adminEmail,
    targetEmail: payload.targetEmail,
  }
}

/**
 * Like readImpersonationContext but returns the full ImpersonationPayload including
 * targetUserId. Used internally by verifySession() to resolve the effective userId.
 */
export async function readImpersonationPayload(
  baseSession: SessionPayload | null
): Promise<ImpersonationPayload | null> {
  const jar = await cookies()

  if (!baseSession) return null

  const isSuperadmin = baseSession.email === process.env.SUPERADMIN_EMAIL

  if (!isSuperadmin) {
    // R2: clear stray cookie when base session is not superadmin
    if (jar.get(IMPERSONATION_COOKIE)) {
      jar.delete(IMPERSONATION_COOKIE)
    }
    return null
  }

  const raw = jar.get(IMPERSONATION_COOKIE)?.value
  if (!raw) return null

  const payload = await verifyImpersonationToken(raw)
  return payload
}

export async function deleteImpersonationSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(IMPERSONATION_COOKIE)
}
