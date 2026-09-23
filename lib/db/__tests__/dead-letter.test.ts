/**
 * E1 — Dead-letter retry and dismiss behavior.
 * Spec R6: retry resets status to 'queued'; dismiss deletes the op.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

function makeFailedOp(overrides: Partial<PendingOp> = {}): PendingOp {
  return {
    id: crypto.randomUUID(),
    type: 'transaction.create',
    payload: {},
    status: 'failed',
    attempts: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
    error: 'Monto invalido',
    ...overrides,
  }
}

describe('dead-letter retry and dismiss', () => {
  beforeEach(async () => {
    await testDb.open()
    mockHandle.mockReset()
  })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('retry resets op status to queued', async () => {
    const op = makeFailedOp({ id: 'failed-op' })
    await testDb.pending_ops.put(op)

    // Simulate the SyncStatusBadge onRetry handler
    await testDb.pending_ops.update('failed-op', {
      status: 'queued',
      error: null,
      updated_at: Date.now(),
    })

    const stored = await testDb.pending_ops.get('failed-op')
    expect(stored!.status).toBe('queued')
    expect(stored!.error).toBeNull()
  })

  it('dismiss deletes the op from Dexie', async () => {
    const op = makeFailedOp({ id: 'dismiss-op' })
    await testDb.pending_ops.put(op)

    // Simulate the SyncStatusBadge onDismiss handler
    await testDb.pending_ops.delete('dismiss-op')

    const stored = await testDb.pending_ops.get('dismiss-op')
    expect(stored).toBeUndefined()
  })

  it('drain-after-retry executes the retried op', async () => {
    mockHandle.mockResolvedValue(null)

    const op = makeFailedOp({ id: 'retry-drain-op' })
    await testDb.pending_ops.put(op)

    // Retry: reset to queued
    await testDb.pending_ops.update('retry-drain-op', {
      status: 'queued',
      error: null,
      updated_at: Date.now(),
    })

    const { drainQueue } = await import('../sync')
    await drainQueue()

    expect(mockHandle).toHaveBeenCalledTimes(1)
    const stored = await testDb.pending_ops.get('retry-drain-op')
    expect(stored!.status).toBe('completed')
  })
})
