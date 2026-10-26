/**
 * B1 — getSessionForAction: null-return scenarios.
 * Spec req: "Non-redirecting session retrieval for Server Actions"
 *
 * Strategy: mock next/headers (cookies), next/navigation (redirect),
 * readImpersonationPayload, isExpired, and createServerClient.
 * All vi.mock factories are free of top-level variable references (hoisting safe).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// All factory closures must be hoisting-safe (no external variable refs).
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/auth/impersonation', () => ({ readImpersonationPayload: vi.fn() }))
vi.mock('@/lib/auth/user-status', () => ({ isExpired: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionForAction } from '@/lib/auth/session'
import { readImpersonationPayload } from '@/lib/auth/impersonation'
import { isExpired } from '@/lib/auth/user-status'
import { createServerClient } from '@/lib/supabase/server'
import { SignJWT } from 'jose'

const mockCookies = vi.mocked(cookies)
const mockRedirect = vi.mocked(redirect)
const mockReadImpersonationPayload = vi.mocked(readImpersonationPayload)
const mockIsExpired = vi.mocked(isExpired)
const mockCreateServerClient = vi.mocked(createServerClient)

const SECRET = 'test-secret-at-least-32-chars-ok!'

async function makeToken(payload: { userId: string; email: string }) {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(SECRET))
}

function buildCookieJar(token: string | null) {
  return {
    get: (name: string) => (name === 'session' && token ? { value: token } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }
}

function buildSupabaseMock(userData: { status: string; expires_at: string | null; email: string } | null) {
  const mockSingle = vi.fn().mockResolvedValue({ data: userData, error: null })
  const mockEq = vi.fn(() => ({ single: mockSingle }))
  const mockSelect = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))
  mockCreateServerClient.mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createServerClient>)
  return mockSingle
}

const VALID_USER_ID = 'user-123'
const VALID_EMAIL = 'test@example.com'

describe('getSessionForAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsExpired.mockReturnValue(false)
    mockReadImpersonationPayload.mockResolvedValue(null)
    process.env.SESSION_SECRET = SECRET
  })

  it('valid session + active non-expired user → returns VerifiedSession', async () => {
    const token = await makeToken({ userId: VALID_USER_ID, email: VALID_EMAIL })
    mockCookies.mockResolvedValue(buildCookieJar(token) as unknown as Awaited<ReturnType<typeof cookies>>)
    buildSupabaseMock({ status: 'active', expires_at: '2099-01-01', email: VALID_EMAIL })

    const result = await getSessionForAction()

    expect(result).not.toBeNull()
    expect(result!.userId).toBe(VALID_USER_ID)
    expect(result!.email).toBe(VALID_EMAIL)
    expect(result!.status).toBe('active')
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('getSession() returns null (no cookie) → returns null, no redirect', async () => {
    mockCookies.mockResolvedValue(buildCookieJar(null) as unknown as Awaited<ReturnType<typeof cookies>>)

    const result = await getSessionForAction()

    expect(result).toBeNull()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('Supabase user is null (non-superadmin) → returns null, no redirect', async () => {
    const token = await makeToken({ userId: VALID_USER_ID, email: VALID_EMAIL })
    mockCookies.mockResolvedValue(buildCookieJar(token) as unknown as Awaited<ReturnType<typeof cookies>>)
    buildSupabaseMock(null)

    const result = await getSessionForAction()

    expect(result).toBeNull()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it("user.status = 'blocked' → returns null, no redirect", async () => {
    const token = await makeToken({ userId: VALID_USER_ID, email: VALID_EMAIL })
    mockCookies.mockResolvedValue(buildCookieJar(token) as unknown as Awaited<ReturnType<typeof cookies>>)
    buildSupabaseMock({ status: 'blocked', expires_at: null, email: VALID_EMAIL })

    const result = await getSessionForAction()

    expect(result).toBeNull()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it("user.status = 'pending' → returns null, no redirect", async () => {
    const token = await makeToken({ userId: VALID_USER_ID, email: VALID_EMAIL })
    mockCookies.mockResolvedValue(buildCookieJar(token) as unknown as Awaited<ReturnType<typeof cookies>>)
    buildSupabaseMock({ status: 'pending', expires_at: null, email: VALID_EMAIL })

    const result = await getSessionForAction()

    expect(result).toBeNull()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('isExpired(user.expires_at) = true → returns null, no redirect', async () => {
    const token = await makeToken({ userId: VALID_USER_ID, email: VALID_EMAIL })
    mockCookies.mockResolvedValue(buildCookieJar(token) as unknown as Awaited<ReturnType<typeof cookies>>)
    mockIsExpired.mockReturnValue(true)
    buildSupabaseMock({ status: 'active', expires_at: '2020-01-01', email: VALID_EMAIL })

    const result = await getSessionForAction()

    expect(result).toBeNull()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('superadmin (base.email === SUPERADMIN_EMAIL), no user row → returns pending-shaped session', async () => {
    const superadminEmail = 'admin@example.com'
    process.env.SUPERADMIN_EMAIL = superadminEmail

    const token = await makeToken({ userId: 'admin-id', email: superadminEmail })
    mockCookies.mockResolvedValue(buildCookieJar(token) as unknown as Awaited<ReturnType<typeof cookies>>)
    buildSupabaseMock(null)

    const result = await getSessionForAction()

    expect(result).not.toBeNull()
    expect(result!.userId).toBe('admin-id')
    expect(result!.isSuperadmin).toBe(true)
    expect(mockRedirect).not.toHaveBeenCalled()

    delete process.env.SUPERADMIN_EMAIL
  })

  it('active impersonation → returns target identity, no redirect', async () => {
    const adminEmail = 'admin@example.com'
    process.env.SUPERADMIN_EMAIL = adminEmail

    const token = await makeToken({ userId: 'admin-id', email: adminEmail })
    mockCookies.mockResolvedValue(buildCookieJar(token) as unknown as Awaited<ReturnType<typeof cookies>>)
    mockReadImpersonationPayload.mockResolvedValue({
      adminUserId: 'admin-id',
      adminEmail: adminEmail,
      targetUserId: 'target-user-id',
      targetEmail: 'target@example.com',
    })
    buildSupabaseMock({ status: 'active', expires_at: '2099-01-01', email: 'target@example.com' })

    const result = await getSessionForAction()

    expect(result).not.toBeNull()
    expect(result!.userId).toBe('target-user-id')
    expect(result!.email).toBe('target@example.com')
    expect(result!.isSuperadmin).toBe(false)
    expect(result!.impersonation).toBeDefined()
    expect(mockRedirect).not.toHaveBeenCalled()

    delete process.env.SUPERADMIN_EMAIL
  })
})
