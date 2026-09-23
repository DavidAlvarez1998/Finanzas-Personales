/**
 * Task 5.3 — writeOp creates Dexie record with UUID + queues pending_op.
 * Mocks navigator.onLine = false to skip drainQueue.
 * Uses fake-indexeddb so no real browser needed.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { FinanzasDB } from '../schema'

// Create a shared db instance for this test module
const testDb = new FinanzasDB()

// Mock the db singleton before any import of write-adapter
vi.mock('../index', () => ({
  db: testDb,
  resetDB: vi.fn(),
}))

// Keep navigator.onLine as false so drainQueue is never called
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: false },
  writable: true,
  configurable: true,
})

describe('writeOp — transaction.create', () => {
  beforeEach(async () => {
    await testDb.open()
  })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('creates a transaction in Dexie and queues a pending_op with status queued', async () => {
    const { writeOp } = await import('../write-adapter')

    const result = await writeOp('transaction.create', {
      user_id: 'user-1',
      description: 'COMPRA TEST',
      date: '2024-01-15',
      income: null,
      expense: 50000,
      currency: 'COP',
      category: null,
    })

    expect(result.ok).toBe(true)
    const id = (result as { ok: true; id: string }).id

    // The transaction should exist in Dexie
    const tx = await testDb.transactions.get(id)
    expect(tx).toBeDefined()
    expect(tx!.id).toBe(id)
    expect(tx!.user_id).toBe('user-1')

    // A pending_op should have been queued
    const ops = await testDb.pending_ops.where('status').equals('queued').toArray()
    expect(ops.length).toBe(1)
    expect(ops[0].type).toBe('transaction.create')
    expect(ops[0].status).toBe('queued')
    expect(ops[0].attempts).toBe(0)
    expect(ops[0].error).toBeNull()

    // Verify R3 pending_op record shape (all 9 required fields)
    const op = ops[0]
    expect(op.id).toBeTruthy()
    expect(op.type).toBe('transaction.create')
    expect(op.payload).toBeTruthy()
    expect(op.status).toBe('queued')
    expect(op.attempts).toBe(0)
    expect(typeof op.created_at).toBe('number')
    expect(typeof op.updated_at).toBe('number')
    expect(op.error).toBeNull()
  })

  it('generates a UUID when id is not provided', async () => {
    const { writeOp } = await import('../write-adapter')

    const result = await writeOp('transaction.create', {
      user_id: 'user-1',
      description: 'NO ID',
      date: '2024-01-15',
      income: 100,
      expense: null,
      currency: 'USD',
      category: null,
    })

    expect(result.ok).toBe(true)
    const id = (result as { ok: true; id: string }).id
    // UUID format check
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })
})
