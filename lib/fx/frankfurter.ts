import type { FxRateResponse } from '@/types'

export async function fetchRate(from: string, to: string): Promise<FxRateResponse> {
  const res = await fetch(`/api/exchange-rate?from=${from}&to=${to}`)
  if (!res.ok) throw new Error(`fetchRate failed: ${res.status}`)
  return res.json() as Promise<FxRateResponse>
}
