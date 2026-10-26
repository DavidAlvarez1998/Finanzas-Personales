/**
 * C1 — Action auth-null regression tests.
 * Spec req: "All Server Actions use getSessionForAction"
 *           "Null session short-circuits action — no mutation"
 *
 * For each action file, mocks getSessionForAction → null and verifies:
 * 1. Action returns { error: 'Unauthorized' }
 * 2. Supabase .from() was never called
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getSessionForAction: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getSessionForAction } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'

const mockGetSessionForAction = vi.mocked(getSessionForAction)
const mockCreateServerClient = vi.mocked(createServerClient)

function buildFormData(fields: Record<string, string> = {}): FormData {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

describe('Server Action auth-null guard (getSessionForAction returns null)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionForAction.mockResolvedValue(null)
    // If createServerClient is called, we want to catch it
    mockCreateServerClient.mockReturnValue({ from: vi.fn() } as unknown as ReturnType<typeof createServerClient>)
  })

  it('createTransaction returns { error: "Unauthorized" } and does NOT call from()', async () => {
    const { createTransaction } = await import('../transactions')
    const result = await createTransaction(buildFormData({
      description: 'test', date: '2024-01-01', type: 'income', amount: '100'
    }))
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  it('createDebt returns { error: "Unauthorized" } and does NOT call from()', async () => {
    const { createDebt } = await import('../debts')
    const result = await createDebt(buildFormData({ description: 'debt', amount: '500' }))
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  it('createPresupuesto returns { error: "Unauthorized" } and does NOT call from()', async () => {
    const { createPresupuesto } = await import('../presupuestos')
    const result = await createPresupuesto(buildFormData({ nombre: 'Enero', total: '1000' }))
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  it('createSavingsGoal returns { error: "Unauthorized" } and does NOT call from()', async () => {
    const { createSavingsGoal } = await import('../savings')
    const result = await createSavingsGoal(buildFormData({ nombre: 'Goal', monto_objetivo: '5000' }))
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  it('createInvestment returns { error: "Unauthorized" } and does NOT call from()', async () => {
    const { createInvestment } = await import('../investments')
    const result = await createInvestment(buildFormData({
      nombre: 'Inv', principal: '10000', currency: 'COP', fecha_inicio: '2024-01-01'
    }))
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  it('createAhorroAccount returns { error: "Unauthorized" } and does NOT call from()', async () => {
    const { createAhorroAccount } = await import('../ahorros')
    const result = await createAhorroAccount(buildFormData({ nombre: 'Caja' }))
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  it('updateUserCurrencies returns { error: "Unauthorized" } and does NOT call from()', async () => {
    const { updateUserCurrencies } = await import('../currencies')
    const result = await updateUserCurrencies(['COP', 'USD'])
    expect(result).toEqual({ error: 'Unauthorized' })
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })
})
