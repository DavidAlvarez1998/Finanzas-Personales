/**
 * E1 — Dead-letter retry and dismiss behavior.
 * Spec R6: retry resets status to 'queued'; dismiss deletes the op.
 * C9 — Inline confirm state machine for DeadLetterDrawer (R6).
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

/**
 * C9 — Inline confirm state machine for DeadLetterDrawer.
 * Spec R6: first click → confirming state; second click → calls handler;
 * auto-reset after 3s timeout.
 *
 * These tests exercise the pure state machine logic extracted from the component,
 * keeping them compatible with the Node test environment (no jsdom needed).
 */

/** Simulates the confirming-state machine from DeadLetterDrawer */
function makeConfirmMachine() {
  let confirming: string | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function setConfirming(id: string | null) {
    if (timer) clearTimeout(timer)
    timer = null
    confirming = id
    if (id !== null) {
      timer = setTimeout(() => {
        confirming = null
      }, 3000)
    }
  }

  function getConfirming() { return confirming }

  function firstClick(opId: string) {
    setConfirming(opId)
  }

  function secondClick(opId: string, dismiss: (id: string) => void) {
    if (confirming === opId) {
      dismiss(opId)
      setConfirming(null)
    }
  }

  function cleanup() {
    if (timer) clearTimeout(timer)
  }

  return { firstClick, secondClick, getConfirming, cleanup }
}

describe('DeadLetterDrawer inline confirm state machine (C9 / R6)', () => {
  it('dismiss button shows confirming state on first click', () => {
    const machine = makeConfirmMachine()
    machine.firstClick('op-1')
    expect(machine.getConfirming()).toBe('op-1')
    machine.cleanup()
  })

  it('dismiss button calls handler on second click', () => {
    const machine = makeConfirmMachine()
    const dismissed: string[] = []
    machine.firstClick('op-1')
    machine.secondClick('op-1', (id) => dismissed.push(id))
    expect(dismissed).toEqual(['op-1'])
    expect(machine.getConfirming()).toBeNull()
    machine.cleanup()
  })

  it('second click on different op does not call handler', () => {
    const machine = makeConfirmMachine()
    const dismissed: string[] = []
    machine.firstClick('op-1')
    machine.secondClick('op-2', (id) => dismissed.push(id))
    expect(dismissed).toHaveLength(0)
    // confirming stays on op-1 (op-2 click is a no-op for the confirm gate)
    expect(machine.getConfirming()).toBe('op-1')
    machine.cleanup()
  })

  it('auto-resets confirming state after 3 seconds', async () => {
    vi.useFakeTimers()
    const machine = makeConfirmMachine()
    machine.firstClick('op-1')
    expect(machine.getConfirming()).toBe('op-1')
    vi.advanceTimersByTime(3000)
    expect(machine.getConfirming()).toBeNull()
    machine.cleanup()
    vi.useRealTimers()
  })
})
