import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from or to' }, { status: 400 })
  }

  if (from === to) {
    return NextResponse.json({ rate: 1, from, to })
  }

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`)
    const data = await res.json()
    const rate = data.rates?.[to]
    if (rate == null) throw new Error(`No rate for ${to}`)
    return NextResponse.json({ rate, from, to })
  } catch {
    return NextResponse.json({ error: 'FX fetch failed' }, { status: 502 })
  }
}
