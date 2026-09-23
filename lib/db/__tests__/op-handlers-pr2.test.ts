/**
 * G2 — Unit tests for op-handlers: presupuesto, savings, currency operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Presupuesto, PresupuestoItem, SavingsGoal, SavingsContribution } from '@/types'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreatePresupuesto = vi.fn()
const mockUpdatePresupuesto = vi.fn()
const mockDeletePresupuesto = vi.fn()
const mockCreatePresupuestoItem = vi.fn()
const mockUpdatePresupuestoItem = vi.fn()
const mockDeletePresupuestoItem = vi.fn()
const mockCreateSavingsGoal = vi.fn()
const mockUpdateSavingsGoal = vi.fn()
const mockDeleteSavingsGoal = vi.fn()
const mockAddContribution = vi.fn()
const mockDeleteContribution = vi.fn()
const mockUpdateGoalStatusInternal = vi.fn()
const mockUpdateUserCurrencies = vi.fn()
const mockUpdateDisplayCurrency = vi.fn()

vi.mock('@/app/actions/presupuestos', () => ({
  createPresupuesto: mockCreatePresupuesto,
  updatePresupuesto: mockUpdatePresupuesto,
  deletePresupuesto: mockDeletePresupuesto,
  createPresupuestoItem: mockCreatePresupuestoItem,
  updatePresupuestoItem: mockUpdatePresupuestoItem,
  deletePresupuestoItem: mockDeletePresupuestoItem,
}))
vi.mock('@/app/actions/savings', () => ({
  createSavingsGoal: mockCreateSavingsGoal,
  updateSavingsGoal: mockUpdateSavingsGoal,
  deleteSavingsGoal: mockDeleteSavingsGoal,
  addContribution: mockAddContribution,
  deleteContribution: mockDeleteContribution,
  updateGoalStatusInternal: mockUpdateGoalStatusInternal,
}))
vi.mock('@/app/actions/currencies', () => ({
  updateUserCurrencies: mockUpdateUserCurrencies,
  updateDisplayCurrency: mockUpdateDisplayCurrency,
}))
vi.mock('@/app/actions/transactions', () => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}))
vi.mock('@/app/actions/debts', () => ({
  createDebt: vi.fn(),
  updateDebt: vi.fn(),
  deleteDebt: vi.fn(),
  createDebtPayment: vi.fn(),
  deleteDebtPayment: vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

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

const fakePresupuesto: Presupuesto = {
  id: 'pres-1', user_id: 'user-1', nombre: 'ENERO', total: 500000, currency: 'COP',
}
const fakeItem: PresupuestoItem = {
  id: 'item-1', presupuesto_id: 'pres-1', nombre: 'ALQUILER', monto: 200000,
}
const fakeGoal: SavingsGoal = {
  id: 'goal-1', user_id: 'user-1', nombre: 'VIAJE', monto_objetivo: 1000000,
  currency: 'COP', status: 'active',
}
const fakeContrib: SavingsContribution = {
  id: 'contrib-1', goal_id: 'goal-1', monto: 100000, fecha: '2024-01-15', nota: null,
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('op-handlers — presupuesto', () => {
  beforeEach(() => vi.clearAllMocks())

  it('presupuesto.create — returns row', async () => {
    mockCreatePresupuesto.mockResolvedValue({ row: fakePresupuesto })
    const { handle } = await import('../op-handlers')
    const result = await handle(makePendingOp('presupuesto.create', { id: 'pres-1', user_id: 'user-1', nombre: 'ENERO', total: '500000', currency: 'COP' }))
    expect(mockCreatePresupuesto).toHaveBeenCalledOnce()
    expect(result).toEqual(fakePresupuesto)
  })

  it('presupuesto.update — calls with correct id', async () => {
    mockUpdatePresupuesto.mockResolvedValue({ row: fakePresupuesto })
    const { handle } = await import('../op-handlers')
    await handle(makePendingOp('presupuesto.update', { id: 'pres-1', nombre: 'ENERO', total: '600000', currency: 'COP' }))
    expect(mockUpdatePresupuesto.mock.calls[0][0]).toBe('pres-1')
  })

  it('presupuesto.delete — calls deletePresupuesto', async () => {
    mockDeletePresupuesto.mockResolvedValue(undefined)
    const { handle } = await import('../op-handlers')
    const result = await handle(makePendingOp('presupuesto.delete', { id: 'pres-1' }))
    expect(mockDeletePresupuesto).toHaveBeenCalledWith('pres-1')
    expect(result).toBeNull()
  })

  it('presupuesto_item.create — calls createPresupuestoItem with correct presupuestoId', async () => {
    mockCreatePresupuestoItem.mockResolvedValue({ row: fakeItem })
    const { handle } = await import('../op-handlers')
    const result = await handle(makePendingOp('presupuesto_item.create', {
      id: 'item-1', presupuesto_id: 'pres-1', nombre: 'ALQUILER', monto: '200000',
    }))
    expect(mockCreatePresupuestoItem.mock.calls[0][0]).toBe('pres-1')
    expect(result).toEqual(fakeItem)
  })

  it('presupuesto_item.update — calls with correct itemId', async () => {
    mockUpdatePresupuestoItem.mockResolvedValue({ row: fakeItem })
    const { handle } = await import('../op-handlers')
    await handle(makePendingOp('presupuesto_item.update', { id: 'item-1', nombre: 'TRANSPORTE', monto: '50000' }))
    expect(mockUpdatePresupuestoItem.mock.calls[0][0]).toBe('item-1')
  })

  it('presupuesto_item.delete — calls deletePresupuestoItem', async () => {
    mockDeletePresupuestoItem.mockResolvedValue(undefined)
    const { handle } = await import('../op-handlers')
    const result = await handle(makePendingOp('presupuesto_item.delete', { id: 'item-1' }))
    expect(mockDeletePresupuestoItem).toHaveBeenCalledWith('item-1')
    expect(result).toBeNull()
  })
})

describe('op-handlers — savings goals', () => {
  beforeEach(() => vi.clearAllMocks())

  it('savings_goal.create — returns row', async () => {
    mockCreateSavingsGoal.mockResolvedValue({ row: fakeGoal })
    const { handle } = await import('../op-handlers')
    const result = await handle(makePendingOp('savings_goal.create', {
      id: 'goal-1', user_id: 'user-1', nombre: 'VIAJE', monto_objetivo: '1000000', currency: 'COP',
    }))
    expect(mockCreateSavingsGoal).toHaveBeenCalledOnce()
    expect(result).toEqual(fakeGoal)
  })

  it('savings_goal.update — calls with correct id', async () => {
    mockUpdateSavingsGoal.mockResolvedValue({ row: fakeGoal })
    const { handle } = await import('../op-handlers')
    await handle(makePendingOp('savings_goal.update', { id: 'goal-1', nombre: 'FONDO', monto_objetivo: '2000000', currency: 'USD' }))
    expect(mockUpdateSavingsGoal.mock.calls[0][0]).toBe('goal-1')
  })

  it('savings_goal.delete — calls deleteSavingsGoal', async () => {
    mockDeleteSavingsGoal.mockResolvedValue(undefined)
    const { handle } = await import('../op-handlers')
    const result = await handle(makePendingOp('savings_goal.delete', { id: 'goal-1' }))
    expect(mockDeleteSavingsGoal).toHaveBeenCalledWith('goal-1')
    expect(result).toBeNull()
  })

  it('savings_goal.status — calls updateGoalStatusInternal with goal_id and status', async () => {
    mockUpdateGoalStatusInternal.mockResolvedValue({ row: { ...fakeGoal, status: 'completed' } })
    const { handle } = await import('../op-handlers')
    await handle(makePendingOp('savings_goal.status', { goal_id: 'goal-1', status: 'completed' }))
    expect(mockUpdateGoalStatusInternal).toHaveBeenCalledWith('goal-1', 'completed')
  })
})

describe('op-handlers — savings contributions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('savings_contribution.create — calls addContribution with goalId and returns row', async () => {
    mockAddContribution.mockResolvedValue({ row: fakeContrib })
    const { handle } = await import('../op-handlers')
    const result = await handle(makePendingOp('savings_contribution.create', {
      id: 'contrib-1', goal_id: 'goal-1', monto: '100000', fecha: '2024-01-15', nota: null,
    }))
    expect(mockAddContribution.mock.calls[0][0]).toBe('goal-1')
    expect(result).toEqual(fakeContrib)
  })

  it('savings_contribution.delete — calls deleteContribution', async () => {
    mockDeleteContribution.mockResolvedValue(undefined)
    const { handle } = await import('../op-handlers')
    const result = await handle(makePendingOp('savings_contribution.delete', { id: 'contrib-1' }))
    expect(mockDeleteContribution).toHaveBeenCalledWith('contrib-1')
    expect(result).toBeNull()
  })
})

describe('op-handlers — currencies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('user.currencies — calls updateUserCurrencies with codes array', async () => {
    mockUpdateUserCurrencies.mockResolvedValue({ row: { currencies: ['COP', 'USD'] } })
    const { handle } = await import('../op-handlers')
    await handle(makePendingOp('user.currencies', { codes: ['COP', 'USD'] }))
    expect(mockUpdateUserCurrencies).toHaveBeenCalledWith(['COP', 'USD'])
  })

  it('user.display_currency — calls updateDisplayCurrency with code', async () => {
    mockUpdateDisplayCurrency.mockResolvedValue({ row: { display_currency: 'USD' } })
    const { handle } = await import('../op-handlers')
    await handle(makePendingOp('user.display_currency', { code: 'USD' }))
    expect(mockUpdateDisplayCurrency).toHaveBeenCalledWith('USD')
  })
})
