'use client'

interface Props {
  value: string
  onChange: (v: string) => void
  min?: number
  required?: boolean
  accent?: 'sky' | 'amber'
}

const FOCUS: Record<NonNullable<Props['accent']>, string> = {
  sky:   'focus-within:border-sky-500',
  amber: 'focus-within:border-amber-500',
}

function toRaw(formatted: string): string {
  return formatted.replace(/\./g, '').replace(/[^\d]/g, '')
}

function format(raw: string): string {
  const n = parseInt(toRaw(raw) || '0', 10)
  if (isNaN(n) || n === 0) return ''
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

export function AmountInput({
  value,
  onChange,
  min = 0,
  required,
  accent = 'sky',
}: Props) {
  function adjust(delta: number) {
    const current = parseInt(toRaw(value) || '0', 10)
    const next = Math.max(min, current + delta)
    onChange(String(next))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = toRaw(e.target.value)
    onChange(raw)
  }

  return (
    <div className={`flex overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 transition-colors ${FOCUS[accent]}`}>
      <input
        type="text"
        inputMode="numeric"
        value={format(value)}
        onChange={handleChange}
        placeholder="0"
        required={required}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
      />
      <div className="flex flex-col divide-y divide-zinc-700 border-l border-zinc-700">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjust(1)}
          aria-label="Aumentar"
          className="flex flex-1 items-center justify-center px-2.5 text-zinc-500 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
            <path d="M1 6.5L5 2l4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjust(-1)}
          aria-label="Disminuir"
          className="flex flex-1 items-center justify-center px-2.5 text-zinc-500 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
            <path d="M1 1.5L5 6l4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
