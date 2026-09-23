/**
 * Task 5.4 — drainQueue: FIFO order, 400 validation error, auth error, transient retry.
 * Uses fake-indexeddb and mocked op-handlers.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { FinanzasDB } from '../schema'
import type { PendingOp } from '../schema'

const testDb = new FinanzasDB()

// Mock the db singleton
vi.mock('../index', () => ({
  db: testDb,
  resetDB: vi.fn(),
}))

// Mock op-handlers — each test overrides the handle function
const mockHandle = vi.fn()
vi.mock('../op-handlers', () => ({
  handle: mockHandle,
}))

// navigator.onLine = true so drainQueue runs
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  writable: true,
  configurable: true,
})

// Provide window for event dispatch in node env
if (typeof window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    writable: true,
    configurable: true,
  })
}

function makeOp(overrides: Partial<PendingOp> = {}): PendingOp {
  return {
    id: crypto.randomUUID(),
    type: 'transaction.create',
    payload: {},
    status: 'queued',
    attempts: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
    error: null,
    ...overrides,
  }
}

describe('drainQueue', () => {
  beforeEach(async () => {
    await testDb.open()
    mockHandle.mockReset()
  })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('drains ops in FIFO order (by created_at)', async () => {
    const callOrder: string[] = []
    mockHandle.mockImplementation((op: PendingOp) => {
      callOrder.push(op.id)
      return Promise.resolve(null)
    })

    const t = Date.now()
    const opA = makeOp({ id: 'op-a', created_at: t })
    const opB = makeOp({ id: 'op-b', created_at: t + 1 })
    const opC = makeOp({ id: 'op-c', created_at: t + 2 })

    await testDb.pending_ops.bulkPut([opA, opB, opC])

    const { drainQueue } = await import('../sync')
    await drainQueue()

    expect(callOrder).toEqual(['op-a', 'op-b', 'op-c'])
  })

  it('marks op as failed on 400 validation error and continues drain (R6/G4)', async () => {
    // Both ops reject with validation error
    let callCount = 0
    mockHandle.mockImplementation(() => {
      callCount++
      const err = Object.assign(new Error('Monto invalido'), { __validation: true })
      return Promise.reject(err)
    })

    const t = Date.now()
    const opA = makeOp({ id: 'op-a', created_at: t })
    const opB = makeOp({ id: 'op-b', created_at: t + 1 })

    await testDb.pending_ops.bulkPut([opA, opB])

    const { drainQueue } = await import('../sync')
    await drainQueue()

    // Both ops must be attempted — failed op must not block the queue
    expect(callCount).toBe(2)

    const storedA = await testDb.pending_ops.get('op-a')
    const storedB = await testDb.pending_ops.get('op-b')

    expect(storedA!.status).toBe('failed')
    expect(storedA!.error).toBe('Monto invalido')
    expect(storedB!.status).toBe('failed') // also attempted and failed
  })

  it('dispatches auth-expired event and preserves op as queued on 401', async () => {
    mockHandle.mockRejectedValue(new Error('Unauthorized'))

    const dispatchedEvents: string[] = []
    const origDispatch = (globalThis as { dispatchEvent?: (e: Event) => void }).dispatchEvent
    ;(globalThis as { dispatchEvent: (e: Event) => void }).dispatchEvent = (e: Event) => {
      dispatchedEvents.push(e.type)
    }

    const op = makeOp({ id: 'auth-op' })
    await testDb.pending_ops.put(op)

    const { drainQueue } = await import('../sync')
    await drainQueue()

    const stored = await testDb.pending_ops.get('auth-op')
    expect(stored!.status).toBe('queued') // preserved, not failed

    expect(dispatchedEvents).toContain('offline-sync:auth-expired')

    if (origDispatch) {
      ;(globalThis as { dispatchEvent: (e: Event) => void }).dispatchEvent = origDispatch
    }
  })

  it('marks op as failed after 5 transient errors', async () => {
    // After 5 attempts it should mark the op as failed (no more retries)
    let callCount = 0
    mockHandle.mockImplementation(() => {
      callCount++
      return Promise.reject(new Error('Network error'))
    })

    // Set attempts to 4 so one more failure triggers the fail condition
    const op = makeOp({ id: 'transient-op', attempts: 4 })
    await testDb.pending_ops.put(op)

    const { drainQueue } = await import('../sync')
    await drainQueue()

    const stored = await testDb.pending_ops.get('transient-op')
    expect(callCount).toBe(1)
    expect(stored!.status).toBe('failed')
    expect(stored!.attempts).toBe(5)
    expect(stored!.error).toContain('Network error')
  }, 10000)
})
