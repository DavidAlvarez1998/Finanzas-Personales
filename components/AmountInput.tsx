'use client'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  step?: number
  min?: number
  required?: boolean
  accent?: 'sky' | 'amber'
}

const FOCUS: Record<NonNullable<Props['accent']>, string> = {
  sky:   'focus-within:border-sky-500',
  amber: 'focus-within:border-amber-500',
}

export function AmountInput({
  value,
  onChange,
  placeholder = '0.00',
  step = 1,
  min = 0,
  required,
  accent = 'sky',
}: Props) {
  function adjust(delta: number) {
    const next = Math.max(min, parseFloat(((parseFloat(value || '0') + delta)).toFixed(2)))
    onChange(String(next))
  }

  return (
    <div className={`flex overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 transition-colors ${FOCUS[accent]}`}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
      />
      <div className="flex flex-col divide-y divide-zinc-700 border-l border-zinc-700">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjust(step)}
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
          onClick={() => adjust(-step)}
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
