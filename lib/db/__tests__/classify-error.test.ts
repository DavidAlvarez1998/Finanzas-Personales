/**
 * A3 — classifyError: NEXT_REDIRECT guard + Unauthorized-before-__validation ordering.
 * Spec req: "Auth-expired event fires on session expiry during sync"
 *
 * NOTE: classifyError must be exported from sync.ts for direct testing.
 */
import { describe, it, expect } from 'vitest'

// classifyError must be exported — this import will fail until A4 adds the export
import { classifyError } from '../sync'

describe('classifyError', () => {
  it('NEXT_REDIRECT object → returns auth', () => {
    const err = { digest: 'NEXT_REDIRECT;replace;/login;307;' }
    expect(classifyError(err)).toBe('auth')
  })

  it('NEXT_REDIRECT with just the prefix → returns auth', () => {
    const err = { digest: 'NEXT_REDIRECT' }
    expect(classifyError(err)).toBe('auth')
  })

  it('Error with message Unauthorized AND __validation=true → returns auth (auth wins)', () => {
    const err = Object.assign(new Error('Unauthorized'), { __validation: true })
    expect(classifyError(err)).toBe('auth')
  })

  it('Error with message Unauthorized (no __validation) → returns auth', () => {
    const err = new Error('Unauthorized')
    expect(classifyError(err)).toBe('auth')
  })

  it('Error with message 401 → returns auth', () => {
    const err = new Error('401 Unauthorized from server')
    expect(classifyError(err)).toBe('auth')
  })

  it('Error with __validation=true and non-auth message → returns validation', () => {
    const err = Object.assign(new Error('Monto invalido'), { __validation: true })
    expect(classifyError(err)).toBe('validation')
  })

  it('Error with 4xx non-401 message → returns validation', () => {
    const err = new Error('400 Bad Request')
    expect(classifyError(err)).toBe('validation')
  })

  it('Generic Error (no special props) → returns transient', () => {
    const err = new Error('Network error')
    expect(classifyError(err)).toBe('transient')
  })

  it('Non-Error unknown (plain object without digest) → returns transient', () => {
    const err = { message: 'something went wrong' }
    expect(classifyError(err)).toBe('transient')
  })

  it('null → returns transient', () => {
    expect(classifyError(null)).toBe('transient')
  })

  it('undefined → returns transient', () => {
    expect(classifyError(undefined)).toBe('transient')
  })
})
