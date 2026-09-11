import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

// Uses @fawazahmed0/currency-api via jsDelivr — free, no key, 170+ currencies including COP/ARS/VES
const CDN_URL = (base: string) =>
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.json`

// Fallback mirror
const FALLBACK_URL = (base: string) =>
  `https://latest.currency-api.pages.dev/v1/currencies/${base.toLowerCase()}.json`

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from or to' }, { status: 400 })
  }

  if (from.toUpperCase() === to.toUpperCase()) {
    return NextResponse.json({ rate: 1, from: from.toUpperCase(), to: to.toUpperCase() })
  }

  const fromLower = from.toLowerCase()
  const toLower = to.toLowerCase()

  for (const url of [CDN_URL(fromLower), FALLBACK_URL(fromLower)]) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (!res.ok) continue
      const data = await res.json()
      const rate = data[fromLower]?.[toLower]
      if (rate == null) continue
      return NextResponse.json({ rate, from: from.toUpperCase(), to: to.toUpperCase() })
    } catch {
      // try next source
    }
  }

  return NextResponse.json({ error: 'FX fetch failed' }, { status: 502 })
}
