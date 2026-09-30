import crypto from 'crypto'

export const RESET_TOKEN_TTL_MS = 3_600_000 // 1 hour

export function generateResetToken(): { raw: string; hashed: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  const hashed = hashResetToken(raw)
  return { raw, hashed }
}

export function hashResetToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}
