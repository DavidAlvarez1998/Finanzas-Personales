/**
 * G3 — Auto-complete logic tests.
 * Tests both write-adapter client-side path (applyOptimistic) and
 * sync.ts replicateSideEffects (post-online reconcile).
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FinanzasDB } from '../schema'
import type { SavingsGoal, SavingsContribution } from '@/types'

const testDb = new FinanzasDB()

vi.mock('../index', () => ({ db: testDb, resetDB: vi.fn() }))

// Mock op-handlers so drainQueue doesn't try real Server Actions.
// The mock returns a fake SavingsContribution row for savings_contribution.create ops.
const mockHandle = vi.fn()
vi.mock('../op-handlers', () => ({ handle: mockHandle }))

// navigator.onLine starts as false; individual tests can flip it.
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: false },
  writable: true,
  configurable: true,
})
if (typeof window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    writable: true,
    configurable: true,
  })
}

function makeGoal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: 'goal-1',
    user_id: 'user-1',
    nombre: 'VIAJE',
    monto_objetivo: 1000,
    currency: 'COP',
    status: 'active',
    ...overrides,
  }
}

function makeContrib(overrides: Partial<SavingsContribution> = {}): SavingsContribution {
  return {
    id: crypto.randomUUID(),
    goal_id: 'goal-1',
    monto: 100,
    fecha: '2024-01-15',
    nota: null,
    ...overrides,
  }
}

describe('write-adapter — savings_contribution.create auto-complete', () => {
  beforeEach(async () => {
    await testDb.open()
    mockHandle.mockReset()
  })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('flips goal to completed when total >= monto_objetivo', async () => {
    // Pre-existing contribution: 900 already saved
    const existingContrib = makeContrib({ id: 'existing', monto: 900 })
    await testDb.savings_goals.put(makeGoal())
    await testDb.savings_contributions.put(existingContrib)

    const { writeOp } = await import('../write-adapter')

    // Add 100 more — total = 1000 = monto_objetivo
    await writeOp('savings_contribution.create', {
      id: 'new-contrib',
      goal_id: 'goal-1',
      monto: 100,
      fecha: '2024-01-16',
      nota: null,
    })

    const goal = await testDb.savings_goals.get('goal-1')
    expect(goal!.status).toBe('completed')
  })

  it('does NOT flip goal when total < monto_objetivo', async () => {
    // Pre-existing contribution: 500
    const existingContrib = makeContrib({ id: 'existing', monto: 500 })
    await testDb.savings_goals.put(makeGoal())
    await testDb.savings_contributions.put(existingContrib)

    const { writeOp } = await import('../write-adapter')

    // Add 200 — total = 700 < 1000
    await writeOp('savings_contribution.create', {
      id: 'new-contrib-2',
      goal_id: 'goal-1',
      monto: 200,
      fecha: '2024-01-16',
      nota: null,
    })

    const goal = await testDb.savings_goals.get('goal-1')
    expect(goal!.status).toBe('active')
  })

  it('does NOT double-flip when goal is already completed', async () => {
    // Goal already completed
    await testDb.savings_goals.put(makeGoal({ status: 'completed' }))
    // Total already at 1000
    await testDb.savings_contributions.put(makeContrib({ id: 'existing', monto: 1000 }))

    const { writeOp } = await import('../write-adapter')

    // Add 50 more
    await writeOp('savings_contribution.create', {
      id: 'extra-contrib',
      goal_id: 'goal-1',
      monto: 50,
      fecha: '2024-01-17',
      nota: null,
    })

    const goal = await testDb.savings_goals.get('goal-1')
    // Still completed — no re-trigger
    expect(goal!.status).toBe('completed')
  })
})

describe('sync.ts — replicateSideEffects auto-complete (post-reconcile)', () => {
  beforeEach(async () => {
    await testDb.open()
    mockHandle.mockReset()
  })

  afterEach(async () => {
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, writable: true, configurable: true })
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('enqueues savings_goal.status op and flips Dexie goal after online reconcile', async () => {
    // Goal is active, contributions already sum to 1000 (= target)
    await testDb.savings_goals.put(makeGoal())
    await testDb.savings_contributions.put(makeContrib({ id: 'c1', monto: 600 }))
    await testDb.savings_contributions.put(makeContrib({ id: 'c2', monto: 400 }))

    // Mock handle to return a SavingsContribution row (simulates server success)
    const returnedContrib: SavingsContribution = makeContrib({ id: 'c2', monto: 400 })
    mockHandle.mockResolvedValueOnce(returnedContrib)

    // Enqueue the savings_contribution.create op
    const now = Date.now()
    await testDb.pending_ops.put({
      id: 'sync-op',
      type: 'savings_contribution.create',
      payload: { goal_id: 'goal-1', monto: 400, fecha: '2024-01-15' },
      optimistic_id: 'c2',
      status: 'queued',
      attempts: 0,
      created_at: now,
      updated_at: now,
      error: null,
    })

    // Go online and drain
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true, configurable: true })

    const { drainQueue } = await import('../sync')
    await drainQueue()

    // Goal should be completed in Dexie
    const goal = await testDb.savings_goals.get('goal-1')
    expect(goal!.status).toBe('completed')

    // A savings_goal.status pending_op should have been enqueued
    const statusOps = await testDb.pending_ops
      .where('type')
      .equals('savings_goal.status')
      .toArray()
    expect(statusOps.length).toBeGreaterThanOrEqual(1)
    expect((statusOps[0].payload as { status: string }).status).toBe('completed')
  })
})
