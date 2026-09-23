/**
 * B3 — FX offline cache tests.
 * Spec R9: "last successfully fetched FX rate MUST be persisted in Dexie"
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FinanzasDB } from '../schema'

const testDb = new FinanzasDB()

vi.mock('../index', () => ({
  db: testDb,
  resetDB: vi.fn(),
}))

describe('FX cache', () => {
  beforeEach(async () => {
    await testDb.open()
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await testDb.transaction('rw', testDb.tables, () =>
      Promise.all(testDb.tables.map(t => t.clear()))
    )
  })

  it('persists rate in Dexie after a successful fetch', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ from: 'USD', to: 'COP', rate: 4200 }),
    } as Response)

    const { fetchRateWithCache } = await import('../../fx/frankfurter')
    const result = await fetchRateWithCache('USD', 'COP')

    expect(result.rate).toBe(4200)
    expect(result.stale).toBe(false)

    const cached = await testDb.fx_rates.get('USD_COP')
    expect(cached).toBeDefined()
    expect(cached!.rate).toBe(4200)
    expect(cached!.source).toBe('frankfurter')
  })

  it('returns stale: true when cached rate is older than 24 hours', async () => {
    const staleFetchedAt = Date.now() - 25 * 60 * 60 * 1000
    await testDb.fx_rates.put({ pair: 'EUR_COP', rate: 4500, fetched_at: staleFetchedAt, source: 'frankfurter' })

    const { getExchangeRate } = await import('../dal-offline')
    const result = await getExchangeRate('EUR', 'COP')

    expect(result).not.toBeNull()
    expect(result!.rate).toBe(4500)
    expect(result!.stale).toBe(true)
  })

  it('returns stale: false when cached rate is recent (< 24 hours)', async () => {
    const freshFetchedAt = Date.now() - 1 * 60 * 60 * 1000 // 1 hour ago
    await testDb.fx_rates.put({ pair: 'GBP_COP', rate: 5200, fetched_at: freshFetchedAt, source: 'frankfurter' })

    const { getExchangeRate } = await import('../dal-offline')
    const result = await getExchangeRate('GBP', 'COP')

    expect(result).not.toBeNull()
    expect(result!.rate).toBe(5200)
    expect(result!.stale).toBe(false)
  })

  it('falls back to cached Dexie value when fetch fails', async () => {
    const fetchedAt = Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago — fresh
    await testDb.fx_rates.put({ pair: 'USD_COP', rate: 4100, fetched_at: fetchedAt, source: 'frankfurter' })

    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

    const { fetchRateWithCache } = await import('../../fx/frankfurter')
    const result = await fetchRateWithCache('USD', 'COP')

    expect(result.rate).toBe(4100)
    expect(result.stale).toBe(false) // 2 hours old — not stale
  })
})
