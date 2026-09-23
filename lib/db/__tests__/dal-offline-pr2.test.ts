/**
 * G4 — Unit tests for new DAL functions: getDebts, getPresupuestos,
 * getSavingsGoals, getUserCurrencies, getDisplayCurrency.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FinanzasDB } from '../schema'
import type { Debt, DebtPayment, Presupuesto, PresupuestoItem, SavingsGoal, SavingsContribution } from '@/types'

const testDb = new FinanzasDB()

vi.mock('../index', () => ({ db: testDb, resetDB: vi.fn() }))

describe('dal-offline — getDebts', () => {
  beforeEach(async () => { await testDb.open() })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('returns debts for userId with computed total_paid and remaining', async () => {
    const debt: Debt = {
      id: 'debt-1', user_id: 'user-1', description: 'DEUDA', amount: 1000, currency: 'COP',
      created_at: new Date().toISOString(),
    }
    const payment: DebtPayment = {
      id: 'pay-1', debt_id: 'debt-1', amount: 400, paid_at: '2024-01-10', nota: null,
    } as DebtPayment

    await testDb.debts.put(debt)
    await testDb.debt_payments.put(payment)

    const { getDebts } = await import('../dal-offline')
    const result = await getDebts('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].total_paid).toBe(400)
    expect(result[0].remaining).toBe(600)
    expect(result[0].payments).toHaveLength(1)
  })

  it('isolates debts by userId', async () => {
    await testDb.debts.put({ id: 'debt-a', user_id: 'user-1', description: 'A', amount: 100, currency: 'COP' } as Debt)
    await testDb.debts.put({ id: 'debt-b', user_id: 'user-2', description: 'B', amount: 200, currency: 'COP' } as Debt)

    const { getDebts } = await import('../dal-offline')
    const result = await getDebts('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('debt-a')
  })

  it('returns empty array when no debts', async () => {
    const { getDebts } = await import('../dal-offline')
    const result = await getDebts('user-nobody')
    expect(result).toEqual([])
  })
})

describe('dal-offline — getPresupuestos', () => {
  beforeEach(async () => { await testDb.open() })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('returns presupuestos with items joined and computed fields', async () => {
    const p: Presupuesto = {
      id: 'pres-1', user_id: 'user-1', nombre: 'ENERO', total: 500, currency: 'COP',
      created_at: new Date().toISOString(),
    }
    const item1: PresupuestoItem = { id: 'item-1', presupuesto_id: 'pres-1', nombre: 'A', monto: 200 }
    const item2: PresupuestoItem = { id: 'item-2', presupuesto_id: 'pres-1', nombre: 'B', monto: 100 }

    await testDb.presupuestos.put(p)
    await testDb.presupuesto_items.bulkPut([item1, item2])

    const { getPresupuestos } = await import('../dal-offline')
    const result = await getPresupuestos('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].monto_asignado).toBe(300)
    expect(result[0].monto_libre).toBe(200)
    expect(result[0].items).toHaveLength(2)
  })

  it('isolates by userId', async () => {
    await testDb.presupuestos.put({ id: 'p1', user_id: 'user-1', nombre: 'X', total: 100, currency: 'COP' } as Presupuesto)
    await testDb.presupuestos.put({ id: 'p2', user_id: 'user-9', nombre: 'Y', total: 100, currency: 'COP' } as Presupuesto)

    const { getPresupuestos } = await import('../dal-offline')
    const result = await getPresupuestos('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
  })
})

describe('dal-offline — getSavingsGoals', () => {
  beforeEach(async () => { await testDb.open() })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('returns goals with contributions joined and computed total/remaining/pct', async () => {
    const goal: SavingsGoal = {
      id: 'goal-1', user_id: 'user-1', nombre: 'VIAJE', monto_objetivo: 1000,
      currency: 'COP', status: 'active', created_at: new Date().toISOString(),
    }
    const c1: SavingsContribution = { id: 'c1', goal_id: 'goal-1', monto: 300, fecha: '2024-01', nota: null }
    const c2: SavingsContribution = { id: 'c2', goal_id: 'goal-1', monto: 200, fecha: '2024-02', nota: null }

    await testDb.savings_goals.put(goal)
    await testDb.savings_contributions.bulkPut([c1, c2])

    const { getSavingsGoals } = await import('../dal-offline')
    const result = await getSavingsGoals('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].total_aportado).toBe(500)
    expect(result[0].remaining).toBe(500)
    expect(result[0].progress_pct).toBeCloseTo(50)
    expect(result[0].contributions).toHaveLength(2)
  })

  it('isolates by userId', async () => {
    await testDb.savings_goals.put({ id: 'g1', user_id: 'user-1', nombre: 'A', monto_objetivo: 100, currency: 'COP', status: 'active' } as SavingsGoal)
    await testDb.savings_goals.put({ id: 'g2', user_id: 'user-9', nombre: 'B', monto_objetivo: 100, currency: 'COP', status: 'active' } as SavingsGoal)

    const { getSavingsGoals } = await import('../dal-offline')
    const result = await getSavingsGoals('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('g1')
  })
})

describe('dal-offline — getUserCurrencies / getDisplayCurrency', () => {
  beforeEach(async () => { await testDb.open() })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('getUserCurrencies returns [] when no meta key exists', async () => {
    const { getUserCurrencies } = await import('../dal-offline')
    const result = await getUserCurrencies('user-1')
    expect(result).toEqual([])
  })

  it('getUserCurrencies returns the stored value', async () => {
    await testDb.meta.put({ key: 'user_currencies', value: ['COP', 'USD', 'EUR'] })
    const { getUserCurrencies } = await import('../dal-offline')
    const result = await getUserCurrencies('user-1')
    expect(result).toEqual(['COP', 'USD', 'EUR'])
  })

  it('getDisplayCurrency returns null when no meta key exists', async () => {
    const { getDisplayCurrency } = await import('../dal-offline')
    const result = await getDisplayCurrency('user-1')
    expect(result).toBeNull()
  })

  it('getDisplayCurrency returns the stored value', async () => {
    await testDb.meta.put({ key: 'display_currency', value: 'USD' })
    const { getDisplayCurrency } = await import('../dal-offline')
    const result = await getDisplayCurrency('user-1')
    expect(result).toBe('USD')
  })
})
