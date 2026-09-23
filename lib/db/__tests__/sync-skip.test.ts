/**
 * A2 — drainQueue continues past a failed validation op.
 * Spec R6 / G4: "Failed op does not block subsequent ops"
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

describe('drainQueue — skip failed ops', () => {
  beforeEach(async () => {
    await testDb.open()
    mockHandle.mockReset()
  })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('continues draining when first op fails with validation error', async () => {
    let callCount = 0

    mockHandle.mockImplementation((op: PendingOp) => {
      callCount++
      if (op.id === 'op-a') {
        const err = Object.assign(new Error('Monto invalido'), { __validation: true })
        return Promise.reject(err)
      }
      return Promise.resolve(null)
    })

    const t = Date.now()
    const opA = makeOp({ id: 'op-a', created_at: t })
    const opB = makeOp({ id: 'op-b', created_at: t + 1 })

    await testDb.pending_ops.bulkPut([opA, opB])

    const { drainQueue } = await import('../sync')
    await drainQueue()

    expect(callCount).toBe(2)

    const storedA = await testDb.pending_ops.get('op-a')
    const storedB = await testDb.pending_ops.get('op-b')

    expect(storedA!.status).toBe('failed')
    expect(storedA!.error).toBe('Monto invalido')
    // op-b is removed after successful drain (completed ops are deleted by reconcile
    // but in this mock reconcile is skipped; just verify it was picked up)
    // The op should have been processed — either completed or removed
    expect(storedB === undefined || storedB!.status === 'completed').toBe(true)
  })

  it('op-b ends up completed when first op fails with validation error', async () => {
    mockHandle.mockImplementation((op: PendingOp) => {
      if (op.id === 'op-a') {
        const err = Object.assign(new Error('Campo requerido'), { __validation: true })
        return Promise.reject(err)
      }
      // op-b succeeds
      return Promise.resolve(null)
    })

    const t = Date.now()
    const opA = makeOp({ id: 'op-a', created_at: t })
    const opB = makeOp({ id: 'op-b', created_at: t + 1 })

    await testDb.pending_ops.bulkPut([opA, opB])

    const { drainQueue } = await import('../sync')
    await drainQueue()

    const storedA = await testDb.pending_ops.get('op-a')
    const storedB = await testDb.pending_ops.get('op-b')

    expect(storedA!.status).toBe('failed')
    expect(storedB!.status).toBe('completed')
  })
})
