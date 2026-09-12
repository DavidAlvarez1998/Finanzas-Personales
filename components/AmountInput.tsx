'use client'

interface Props {
  value: string
  onChange: (v: string) => void
  decimals?: number
  min?: number
  required?: boolean
  accent?: 'sky' | 'amber' | 'violet'
}

const FOCUS: Record<NonNullable<Props['accent']>, string> = {
  sky:    'focus-within:border-sky-600 dark:focus-within:border-sky-500',
  amber:  'focus-within:border-amber-600 dark:focus-within:border-amber-500',
  violet: 'focus-within:border-violet-600 dark:focus-within:border-violet-500',
}

// Accepts raw user input. Strips thousands dots, keeps digits and at most
// one comma, trims fractional part to `decimals` digits.
function sanitizeInput(input: string, decimals: number): string {
  const noThousands = input.replace(/\./g, '')
  const cleaned = noThousands.replace(/[^\d,]/g, '')
  const firstComma = cleaned.indexOf(',')
  if (decimals === 0 || firstComma === -1) {
    return cleaned.replace(/,/g, '')
  }
  const intPart = cleaned.slice(0, firstComma)
  const fracPart = cleaned.slice(firstComma + 1).replace(/,/g, '').slice(0, decimals)
  return fracPart.length > 0 ? `${intPart},${fracPart}` : `${intPart},`
}

// Convert sanitized display string ("1234,56") into dot-separated raw
// string safe for parseFloat(). NEVER emits a comma-separated string.
function displayToRaw(display: string): string {
  if (display === '' || display === ',') return ''
  const [i, f] = display.split(',')
  if (f == null || f === '') return i
  return `${i}.${f}`
}

// Convert dot-separated raw back to es-AR display shape.
// Preserves in-progress fractional typing (no trailing zeros while typing).
function rawToDisplay(raw: string, decimals: number): string {
  if (raw === '' || raw === '.') return ''
  const [intStr, fracStr] = raw.split('.')
  const intNum = parseInt(intStr || '0', 10)
  if (!Number.isFinite(intNum)) return ''
  const intFormatted = new Intl.NumberFormat('es-AR').format(intNum)
  if (fracStr == null) return intFormatted
  return `${intFormatted},${fracStr.slice(0, decimals)}`
}

export function AmountInput({
  value,
  onChange,
  decimals = 2,
  min = 0,
  required,
  accent = 'sky',
}: Props) {
  function adjust(delta: number) {
    const current = parseFloat(value || '0')
    const next = Math.max(min, current + delta)
    onChange(decimals === 0 ? String(Math.trunc(next)) : next.toFixed(decimals))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const display = sanitizeInput(e.target.value, decimals)
    const raw = displayToRaw(display)
    onChange(raw)
  }

  return (
    <div className={`flex overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100 transition-colors dark:border-zinc-700 dark:bg-zinc-800 ${FOCUS[accent]}`}>
      <input
        type="text"
        inputMode="decimal"
        value={rawToDisplay(value, decimals)}
        onChange={handleChange}
        placeholder={decimals > 0 ? '0,00' : '0'}
        required={required}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none dark:text-white dark:placeholder-zinc-500"
      />
      <div className="flex flex-col divide-y divide-zinc-300 border-l border-zinc-300 dark:divide-zinc-700 dark:border-zinc-700">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjust(1)}
          aria-label="Aumentar"
          className="flex flex-1 items-center justify-center px-2.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors dark:hover:bg-zinc-700 dark:hover:text-white"
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
          className="flex flex-1 items-center justify-center px-2.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors dark:hover:bg-zinc-700 dark:hover:text-white"
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
            <path d="M1 1.5L5 6l4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
