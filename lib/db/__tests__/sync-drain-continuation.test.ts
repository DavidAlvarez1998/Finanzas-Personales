/**
 * A1 — drainQueue: transient-exhausted op MUST NOT halt the queue.
 * Spec req: "Transient-max-attempts drain continuation"
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { FinanzasDB } from '../schema'
import type { PendingOp } from '../schema'

const testDb = new FinanzasDB()

vi.mock('../index', () => ({
  db: testDb,
  resetDB: vi.fn(),
}))

const mockHandle = vi.fn()
vi.mock('../op-handlers', () => ({
  handle: mockHandle,
}))

Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
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

describe('drainQueue — transient max-attempts continuation', () => {
  beforeEach(async () => {
    await testDb.open()
    mockHandle.mockReset()
  })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('Scenario 1: transient-exhausted op-A is failed, op-B is still processed', async () => {
    const t = Date.now()
    const opA = makeOp({ id: 'op-a', created_at: t, attempts: 4 })
    const opB = makeOp({ id: 'op-b', created_at: t + 1 })

    await testDb.pending_ops.bulkPut([opA, opB])

    mockHandle.mockImplementation((op: PendingOp) => {
      if (op.id === 'op-a') return Promise.reject(new Error('Network error'))
      return Promise.resolve(null) // op-B succeeds
    })

    const { drainQueue } = await import('../sync')
    await drainQueue()

    const storedA = await testDb.pending_ops.get('op-a')
    const storedB = await testDb.pending_ops.get('op-b')

    // op-A must be failed/transient
    expect(storedA!.status).toBe('failed')
    expect(storedA!.error_class).toBe('transient')
    expect(storedA!.attempts).toBe(5)

    // op-B must have been processed and completed
    expect(storedB!.status).toBe('completed')
  })

  it('Scenario 2: multiple transient-exhausted ops all fail, drain exits cleanly (drainedClean)', async () => {
    const t = Date.now()
    const opA = makeOp({ id: 'op-a', created_at: t, attempts: 4 })
    const opB = makeOp({ id: 'op-b', created_at: t + 1, attempts: 4 })
    const opC = makeOp({ id: 'op-c', created_at: t + 2, attempts: 4 })

    await testDb.pending_ops.bulkPut([opA, opB, opC])

    mockHandle.mockRejectedValue(new Error('Network error'))

    const before = Date.now()
    const { drainQueue } = await import('../sync')
    await drainQueue()

    for (const id of ['op-a', 'op-b', 'op-c']) {
      const stored = await testDb.pending_ops.get(id)
      expect(stored!.status).toBe('failed')
      expect(stored!.error_class).toBe('transient')
    }

    // drainedClean = true means last_sync_at was updated in meta
    const meta = await testDb.meta.get('last_sync_at')
    expect(meta).toBeDefined()
    expect(meta!.value as number).toBeGreaterThanOrEqual(before)
  })

  it('Scenario 3 (regression): auth error on op-A still breaks — op-B NOT processed', async () => {
    const t = Date.now()
    const opA = makeOp({ id: 'op-a', created_at: t })
    const opB = makeOp({ id: 'op-b', created_at: t + 1 })

    await testDb.pending_ops.bulkPut([opA, opB])

    const dispatchedEvents: string[] = []
    ;(globalThis as { dispatchEvent: (e: Event) => void }).dispatchEvent = (e: Event) => {
      dispatchedEvents.push(e.type)
    }

    mockHandle.mockRejectedValue(new Error('Unauthorized'))

    const { drainQueue } = await import('../sync')
    await drainQueue()

    const storedA = await testDb.pending_ops.get('op-a')
    const storedB = await testDb.pending_ops.get('op-b')

    // op-A preserved as queued (auth path)
    expect(storedA!.status).toBe('queued')
    // op-B must NOT be processed
    expect(storedB!.status).toBe('queued')

    // auth-expired event must have been dispatched
    expect(dispatchedEvents).toContain('offline-sync:auth-expired')
  })
})
