import type { FxRateResponse } from '@/types'
import { db } from '@/lib/db/index'

export async function fetchRate(from: string, to: string): Promise<FxRateResponse> {
  const res = await fetch(`/api/exchange-rate?from=${from}&to=${to}`)
  if (!res.ok) throw new Error(`fetchRate failed: ${res.status}`)
  return res.json() as Promise<FxRateResponse>
}

/**
 * Fetch an FX rate and persist it in Dexie.
 * Falls back to the cached Dexie value on any network failure.
 * Returns `stale: true` when the cache hit is older than 24 hours.
 */
export async function fetchRateWithCache(
  from: string,
  to: string
): Promise<{ rate: number; stale: boolean }> {
  const pair = `${from}_${to}`
  try {
    const data = await fetchRate(from, to)
    await db.fx_rates.put({
      pair,
      rate: data.rate,
      fetched_at: Date.now(),
      source: 'frankfurter',
    })
    return { rate: data.rate, stale: false }
  } catch {
    // Network error — fall back to cached value
    const cached = await db.fx_rates.get(pair)
    if (!cached) throw new Error(`No cached FX rate for ${pair}`)
    const STALE_MS = 24 * 60 * 60 * 1000
    return { rate: cached.rate, stale: Date.now() - cached.fetched_at > STALE_MS }
  }
}
