'use client'

import { useState, useEffect, useRef } from 'react'

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

// In es-AR: '.' = thousands separator (always stripped), ',' = decimal separator.
// Strips all dots, keeps digits and at most one comma, trims fractional part.
function sanitizeInput(input: string, decimals: number): string {
  const withoutDots = input.replace(/\./g, '')
  const cleaned = withoutDots.replace(/[^\d,]/g, '')
  const firstComma = cleaned.indexOf(',')
  if (decimals === 0 || firstComma === -1) {
    return cleaned.replace(/,/g, '')
  }
  const intPart = cleaned.slice(0, firstComma)
  const fracPart = cleaned.slice(firstComma + 1).replace(/,/g, '').slice(0, decimals)
  return fracPart.length > 0 ? `${intPart},${fracPart}` : `${intPart},`
}

// Convert display string ("1.234,56") into dot-separated raw string for parseFloat().
function displayToRaw(display: string): string {
  if (display === '' || display === ',') return ''
  const stripped = display.replace(/\./g, '')
  const [i, f] = stripped.split(',')
  if (f == null || f === '') return i
  return `${i}.${f}`
}

// Convert dot-separated raw to es-AR display ("1.234,56").
// Preserves trailing comma and in-progress fractional digits (no forced zeros while typing).
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
  const [display, setDisplay] = useState(() => rawToDisplay(value, decimals))
  const focused = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync display when value changes externally (adjust buttons, form reset)
  useEffect(() => {
    if (!focused.current && displayToRaw(display) !== value) {
      setDisplay(rawToDisplay(value, decimals))
    }
  }, [value])

  function adjust(delta: number) {
    const current = parseFloat(value || '0')
    const next = Math.max(min, current + delta)
    const newRaw = decimals === 0 ? String(Math.trunc(next)) : next.toFixed(decimals)
    setDisplay(rawToDisplay(newRaw, decimals))
    onChange(newRaw)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const cursorPos = input.selectionStart ?? input.value.length

    // Count significant chars (digits + comma, NOT dots) before cursor
    const beforeCursor = input.value.slice(0, cursorPos).replace(/\./g, '')
    const sigBeforeCursor = beforeCursor.length

    const sanitized = sanitizeInput(input.value, decimals)
    const raw = displayToRaw(sanitized)
    const trailingComma = sanitized.endsWith(',')
    const formatted = raw !== '' ? rawToDisplay(raw, decimals) : ''
    const finalDisplay = trailingComma && !formatted.includes(',') ? `${formatted},` : formatted

    setDisplay(finalDisplay)
    onChange(raw)

    // Restore cursor: skip sigBeforeCursor significant chars in the new formatted string
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      let sigCount = 0
      let newCursor = finalDisplay.length
      for (let i = 0; i < finalDisplay.length; i++) {
        if (finalDisplay[i] !== '.') {
          sigCount++
          if (sigCount === sigBeforeCursor) {
            newCursor = i + 1
            break
          }
        }
      }
      el.setSelectionRange(newCursor, newCursor)
    })
  }

  return (
    <div className={`flex overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100 transition-colors dark:border-zinc-700 dark:bg-zinc-800 ${FOCUS[accent]}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onFocus={() => { focused.current = true }}
        onBlur={() => { focused.current = false }}
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
