import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any dynamic import of the module
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin-dal', () => ({
  getUserByEmail: vi.fn(),
  setResetToken: vi.fn(),
  getUserByResetToken: vi.fn(),
  clearResetToken: vi.fn(),
  updatePasswordHash: vi.fn(),
}))

vi.mock('@/lib/email/resend', () => ({
  sendPasswordResetEmail: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { requestPasswordReset, resetPassword } from './auth'
import * as dal from '@/lib/supabase/admin-dal'
import * as resend from '@/lib/email/resend'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

// ---------------------------------------------------------------------------
// requestPasswordReset — T-08a
// ---------------------------------------------------------------------------

describe('requestPasswordReset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.APP_URL = 'http://localhost:3000'
    process.env.RESEND_API_KEY = 'test-key'
  })

  it('returns { ok: true } when user exists and is active', async () => {
    vi.mocked(dal.getUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      status: 'active',
      expires_at: null,
    })
    vi.mocked(dal.setResetToken).mockResolvedValue(undefined)
    vi.mocked(resend.sendPasswordResetEmail).mockResolvedValue(undefined)

    const result = await requestPasswordReset(
      makeFormData({ email: 'user@example.com' })
    )

    expect(result).toEqual({ ok: true })
    expect(dal.setResetToken).toHaveBeenCalledOnce()
    expect(resend.sendPasswordResetEmail).toHaveBeenCalledOnce()
  })

  it('returns { ok: true } when user does NOT exist (enumeration guard)', async () => {
    vi.mocked(dal.getUserByEmail).mockResolvedValue(null)

    const result = await requestPasswordReset(
      makeFormData({ email: 'ghost@example.com' })
    )

    expect(result).toEqual({ ok: true })
    // No email sent, no token stored
    expect(dal.setResetToken).not.toHaveBeenCalled()
    expect(resend.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('returns { ok: true } when user exists but is inactive (enumeration guard)', async () => {
    vi.mocked(dal.getUserByEmail).mockResolvedValue({
      id: 'user-2',
      email: 'inactive@example.com',
      status: 'pending',
      expires_at: null,
    })

    const result = await requestPasswordReset(
      makeFormData({ email: 'inactive@example.com' })
    )

    expect(result).toEqual({ ok: true })
    expect(dal.setResetToken).not.toHaveBeenCalled()
    expect(resend.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('returns { error } when email is missing', async () => {
    const result = await requestPasswordReset(makeFormData({}))
    expect(result).toHaveProperty('error')
  })
})

// ---------------------------------------------------------------------------
// resetPassword — T-08b
// ---------------------------------------------------------------------------

describe('resetPassword', () => {
  const VALID_TOKEN = 'a'.repeat(64) // 64-char hex-like string

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updatePasswordHash and clearResetToken then redirects on valid token', async () => {
    vi.mocked(dal.getUserByResetToken).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      reset_token_expires_at: new Date(Date.now() + 60_000).toISOString(),
    })
    vi.mocked(dal.updatePasswordHash).mockResolvedValue(undefined)
    vi.mocked(dal.clearResetToken).mockResolvedValue(undefined)
    // redirect() in Next.js throws — simulate success by returning undefined
    vi.mocked(redirect).mockImplementation(() => { throw new Error('NEXT_REDIRECT') })

    await expect(
      resetPassword(makeFormData({ token: VALID_TOKEN, password: 'newpassword123' }))
    ).rejects.toThrow('NEXT_REDIRECT')

    expect(dal.updatePasswordHash).toHaveBeenCalledOnce()
    expect(dal.clearResetToken).toHaveBeenCalledWith('user-1')
    expect(redirect).toHaveBeenCalledWith('/login?reset=ok')
  })

  it('returns { error } and does NOT call updatePasswordHash for expired/invalid token', async () => {
    vi.mocked(dal.getUserByResetToken).mockResolvedValue(null)

    const result = await resetPassword(
      makeFormData({ token: VALID_TOKEN, password: 'newpassword123' })
    )

    expect(result).toHaveProperty('error')
    expect(dal.updatePasswordHash).not.toHaveBeenCalled()
  })

  it('returns { error } and does NOT call updatePasswordHash when token is missing', async () => {
    const result = await resetPassword(
      makeFormData({ password: 'newpassword123' })
    )

    expect(result).toHaveProperty('error')
    expect(dal.updatePasswordHash).not.toHaveBeenCalled()
    expect(dal.getUserByResetToken).not.toHaveBeenCalled()
  })

  it('returns { error } and does NOT call updatePasswordHash when password is too short', async () => {
    vi.mocked(dal.getUserByResetToken).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      reset_token_expires_at: new Date(Date.now() + 60_000).toISOString(),
    })

    const result = await resetPassword(
      makeFormData({ token: VALID_TOKEN, password: 'short' })
    )

    expect(result).toEqual({ error: 'La contraseña debe tener al menos 8 caracteres.' })
    expect(dal.updatePasswordHash).not.toHaveBeenCalled()
    expect(dal.clearResetToken).not.toHaveBeenCalled()
  })
})
