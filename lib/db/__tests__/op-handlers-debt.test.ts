/**
 * G1 — Unit tests for op-handlers: debt and debt_payment operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Debt, DebtPayment } from '@/types'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateDebt = vi.fn()
const mockUpdateDebt = vi.fn()
const mockDeleteDebt = vi.fn()
const mockCreateDebtPayment = vi.fn()
const mockDeleteDebtPayment = vi.fn()

vi.mock('@/app/actions/debts', () => ({
  createDebt: mockCreateDebt,
  updateDebt: mockUpdateDebt,
  deleteDebt: mockDeleteDebt,
  createDebtPayment: mockCreateDebtPayment,
  deleteDebtPayment: mockDeleteDebtPayment,
}))

// Stub out all other Server Actions so the module resolves
vi.mock('@/app/actions/transactions', () => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}))
vi.mock('@/app/actions/presupuestos', () => ({
  createPresupuesto: vi.fn(),
  updatePresupuesto: vi.fn(),
  deletePresupuesto: vi.fn(),
  createPresupuestoItem: vi.fn(),
  updatePresupuestoItem: vi.fn(),
  deletePresupuestoItem: vi.fn(),
}))
vi.mock('@/app/actions/savings', () => ({
  createSavingsGoal: vi.fn(),
  updateSavingsGoal: vi.fn(),
  deleteSavingsGoal: vi.fn(),
  addContribution: vi.fn(),
  deleteContribution: vi.fn(),
  updateGoalStatusInternal: vi.fn(),
}))
vi.mock('@/app/actions/currencies', () => ({
  updateUserCurrencies: vi.fn(),
  updateDisplayCurrency: vi.fn(),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePendingOp(type: string, payload: Record<string, unknown>) {
  return {
    id: 'op-1',
    type: type as import('../schema').PendingOpType,
    payload,
    status: 'queued' as const,
    attempts: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
    error: null,
  }
}

const fakeDebt: Debt = {
  id: 'debt-1',
  user_id: 'user-1',
  description: 'DEUDA TEST',
  amount: 100000,
  currency: 'COP',
  created_at: new Date().toISOString(),
}

const fakePayment: DebtPayment = {
  id: 'pay-1',
  debt_id: 'debt-1',
  amount: 50000,
  paid_at: '2024-01-15',
  note: null,
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('op-handlers — debt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debt.create — calls createDebt and returns the row', async () => {
    mockCreateDebt.mockResolvedValue({ row: fakeDebt })

    const { handle } = await import('../op-handlers')
    const op = makePendingOp('debt.create', {
      id: 'debt-1',
      user_id: 'user-1',
      description: 'DEUDA TEST',
      amount: '100000',
      currency: 'COP',
    })

    const result = await handle(op)

    expect(mockCreateDebt).toHaveBeenCalledOnce()
    expect(result).toEqual(fakeDebt)
  })

  it('debt.update — calls updateDebt with correct id and returns the row', async () => {
    mockUpdateDebt.mockResolvedValue({ row: fakeDebt })

    const { handle } = await import('../op-handlers')
    const op = makePendingOp('debt.update', {
      id: 'debt-1',
      description: 'DEUDA ACTUALIZADA',
      amount: '200000',
      currency: 'USD',
    })

    const result = await handle(op)

    expect(mockUpdateDebt).toHaveBeenCalledOnce()
    const [calledId] = mockUpdateDebt.mock.calls[0]
    expect(calledId).toBe('debt-1')
    expect(result).toEqual(fakeDebt)
  })

  it('debt.delete — calls deleteDebt and returns null', async () => {
    mockDeleteDebt.mockResolvedValue(undefined)

    const { handle } = await import('../op-handlers')
    const op = makePendingOp('debt.delete', { id: 'debt-1' })

    const result = await handle(op)

    expect(mockDeleteDebt).toHaveBeenCalledWith('debt-1')
    expect(result).toBeNull()
  })

  it('debt_payment.create — calls createDebtPayment with correct debtId and returns row', async () => {
    mockCreateDebtPayment.mockResolvedValue({ row: fakePayment })

    const { handle } = await import('../op-handlers')
    const op = makePendingOp('debt_payment.create', {
      id: 'pay-1',
      debt_id: 'debt-1',
      amount: '50000',
      paid_at: '2024-01-15',
      note: null,
    })

    const result = await handle(op)

    expect(mockCreateDebtPayment).toHaveBeenCalledOnce()
    const [calledDebtId] = mockCreateDebtPayment.mock.calls[0]
    expect(calledDebtId).toBe('debt-1')
    expect(result).toEqual(fakePayment)
  })

  it('debt_payment.delete — calls deleteDebtPayment and returns void', async () => {
    mockDeleteDebtPayment.mockResolvedValue(undefined)

    const { handle } = await import('../op-handlers')
    const op = makePendingOp('debt_payment.delete', { id: 'pay-1' })

    await handle(op)

    expect(mockDeleteDebtPayment).toHaveBeenCalledWith('pay-1')
  })

  it('unknown op type — throws with __validation: true', async () => {
    const { handle } = await import('../op-handlers')
    const op = makePendingOp('unknown.type', {})

    await expect(handle(op)).rejects.toMatchObject({ __validation: true })
  })
})
