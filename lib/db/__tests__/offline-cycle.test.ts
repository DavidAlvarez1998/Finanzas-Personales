/**
 * Task 5.5 — full offline→online cycle:
 * writeOp while offline → pending_op queued → drainQueue with mocked Server Action
 * → Dexie record updated with server row → pending_op completed.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { FinanzasDB } from '../schema'
import type { Transaction } from '@/types'

const testDb = new FinanzasDB()
const mockHandle = vi.fn()

vi.mock('../index', () => ({
  db: testDb,
  resetDB: vi.fn(),
}))

vi.mock('../op-handlers', () => ({
  handle: mockHandle,
}))

describe('offline → online cycle', () => {
  beforeEach(async () => {
    await testDb.open()
    mockHandle.mockReset()
    // Start offline
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      writable: true,
      configurable: true,
    })
  })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('replaces optimistic Dexie record with server row after sync', async () => {
    const { writeOp } = await import('../write-adapter')

    // Write while offline
    const result = await writeOp('transaction.create', {
      user_id: 'user-1',
      description: 'OFFLINE PURCHASE',
      date: '2024-03-01',
      income: null,
      expense: 80000,
      currency: 'COP',
      category: null,
    })

    expect(result.ok).toBe(true)
    const clientId = (result as { ok: true; id: string }).id

    // Verify optimistic record in Dexie
    const optimistic = await testDb.transactions.get(clientId)
    expect(optimistic).toBeDefined()

    // Verify pending_op was queued
    const pendingBefore = await testDb.pending_ops.where('status').equals('queued').toArray()
    expect(pendingBefore.length).toBe(1)
    const op = pendingBefore[0]

    // Server-confirmed row (same ID)
    const serverRow: Transaction = {
      id: clientId,
      user_id: 'user-1',
      date: '2024-03-01',
      description: 'OFFLINE PURCHASE',
      income: null,
      expense: 80000,
      currency: 'COP',
      created_at: '2024-03-01T10:00:00Z',
    }

    mockHandle.mockResolvedValue(serverRow)

    // Go online and drain
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    })

    const { drainQueue } = await import('../sync')
    await drainQueue()

    // Server row should be in Dexie with server-confirmed fields
    const synced = await testDb.transactions.get(clientId)
    expect(synced).toBeDefined()
    expect(synced!.created_at).toBe('2024-03-01T10:00:00Z')

    // The pending_op should be completed (engine marks completed, not deleted)
    const pendingAfter = await testDb.pending_ops.get(op.id)
    expect(pendingAfter!.status).toBe('completed')
  })

  it('handles server returning a different ID (ID reconciliation)', async () => {
    const { writeOp } = await import('../write-adapter')

    const result = await writeOp('transaction.create', {
      user_id: 'user-1',
      description: 'ID SWAP TEST',
      date: '2024-03-02',
      income: 500,
      expense: null,
      currency: 'USD',
      category: null,
    })

    expect(result.ok).toBe(true)
    const clientId = (result as { ok: true; id: string }).id

    // Server returns a different ID
    const serverRow: Transaction = {
      id: 'server-generated-id-999',
      user_id: 'user-1',
      date: '2024-03-02',
      description: 'ID SWAP TEST',
      income: 500,
      expense: null,
      currency: 'USD',
      created_at: '2024-03-02T12:00:00Z',
    }

    mockHandle.mockResolvedValue(serverRow)

    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    })

    const { drainQueue } = await import('../sync')
    await drainQueue()

    // Client ID should be removed
    const clientRecord = await testDb.transactions.get(clientId)
    expect(clientRecord).toBeUndefined()

    // Server ID should be present
    const serverRecord = await testDb.transactions.get('server-generated-id-999')
    expect(serverRecord).toBeDefined()
    expect(serverRecord!.income).toBe(500)
  })
})
