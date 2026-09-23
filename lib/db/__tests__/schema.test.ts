/**
 * Task 5.1 — verify all 10 tables exist on FinanzasDB and PendingOp shape.
 * Uses fake-indexeddb so no real browser needed.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { FinanzasDB } from '../schema'
import type { PendingOp, PendingOpStatus } from '../schema'

let db: FinanzasDB

beforeEach(async () => {
  // Create a fresh DB for each test
  db = new FinanzasDB()
  await db.open()
})

describe('FinanzasDB — tables', () => {
  const EXPECTED_TABLES = [
    'transactions',
    'debts',
    'debt_payments',
    'presupuestos',
    'presupuesto_items',
    'savings_goals',
    'savings_contributions',
    'pending_ops',
    'fx_rates',
    'meta',
  ]

  it('has all 10 tables', () => {
    const tableNames = db.tables.map(t => t.name)
    for (const name of EXPECTED_TABLES) {
      expect(tableNames).toContain(name)
    }
    expect(tableNames.length).toBe(EXPECTED_TABLES.length)
  })
})

describe('PendingOp — schema shape', () => {
  it('stores and retrieves a complete PendingOp record with all 9 required fields', async () => {
    const op: PendingOp = {
      id: 'test-id-123',
      type: 'transaction.create',
      payload: { description: 'Test', amount: 100 },
      status: 'queued' as PendingOpStatus,
      attempts: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
      error: null,
    }

    await db.pending_ops.put(op)
    const stored = await db.pending_ops.get('test-id-123')

    expect(stored).toBeDefined()
    expect(stored!.id).toBe('test-id-123')
    expect(stored!.type).toBe('transaction.create')
    expect(stored!.payload).toEqual({ description: 'Test', amount: 100 })
    expect(stored!.status).toBe('queued')
    expect(stored!.attempts).toBe(0)
    expect(typeof stored!.created_at).toBe('number')
    expect(typeof stored!.updated_at).toBe('number')
    expect(stored!.error).toBeNull()
  })

  it('allows optional optimistic_id field', async () => {
    const op: PendingOp = {
      id: 'with-optimistic',
      type: 'transaction.create',
      payload: {},
      optimistic_id: 'client-uuid-xyz',
      status: 'queued',
      attempts: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
      error: null,
    }

    await db.pending_ops.put(op)
    const stored = await db.pending_ops.get('with-optimistic')
    expect(stored!.optimistic_id).toBe('client-uuid-xyz')
  })
})
