import { describe, it, expect } from 'vitest'
import {
  generateResetToken,
  hashResetToken,
  RESET_TOKEN_TTL_MS,
} from './reset-token'

describe('generateResetToken', () => {
  it('returns a raw token that is 64 hex characters', () => {
    const { raw } = generateResetToken()
    expect(raw).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns a hashed token that is 64 hex characters', () => {
    const { hashed } = generateResetToken()
    expect(hashed).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashed is not equal to raw', () => {
    const { raw, hashed } = generateResetToken()
    expect(hashed).not.toBe(raw)
  })

  it('two separate calls produce different raw tokens', () => {
    const a = generateResetToken()
    const b = generateResetToken()
    expect(a.raw).not.toBe(b.raw)
  })
})

describe('hashResetToken', () => {
  it('is deterministic — same input always produces same hash', () => {
    const { raw } = generateResetToken()
    expect(hashResetToken(raw)).toBe(hashResetToken(raw))
  })

  it('matches the hashed value returned by generateResetToken', () => {
    const { raw, hashed } = generateResetToken()
    expect(hashResetToken(raw)).toBe(hashed)
  })
})

describe('RESET_TOKEN_TTL_MS', () => {
  it('equals 3 600 000 ms (1 hour)', () => {
    expect(RESET_TOKEN_TTL_MS).toBe(3_600_000)
  })
})
