'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
  icon?: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
  accent?: 'sky' | 'amber' | 'violet'
  className?: string
}

const ACCENT = {
  sky:    'border-sky-500 ring-sky-500/20',
  amber:  'border-amber-500 ring-amber-500/20',
  violet: 'border-violet-500 ring-violet-500/20',
}

const ACCENT_ITEM = {
  sky:    'text-sky-600 dark:text-sky-400',
  amber:  'text-amber-600 dark:text-amber-400',
  violet: 'text-violet-600 dark:text-violet-400',
}

interface DropdownPos {
  top?: number
  bottom?: number
  left?: number
  right?: number
  width: number
}

export function Select({ value, onChange, options, disabled, accent = 'sky', className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [above, setAbove] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<DropdownPos>({ left: 0, right: undefined, width: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const id = useId()

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function handleScroll(e: Event) {
      if (listRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleToggle() {
    if (disabled) return
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openAbove = spaceBelow < 200
      setAbove(openAbove)
      const spaceRight = window.innerWidth - rect.right
      const alignRight = spaceRight < 160
      setDropdownPos({
        top: openAbove ? undefined : rect.bottom + 4,
        bottom: openAbove ? window.innerHeight - rect.top + 4 : undefined,
        left: alignRight ? undefined : rect.left,
        right: alignRight ? window.innerWidth - rect.right : undefined,
        width: rect.width,
      })
    }
    setOpen(prev => !prev)
  }

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    ...(dropdownPos.right !== undefined
      ? { right: dropdownPos.right }
      : { left: dropdownPos.left }),
    minWidth: Math.max(dropdownPos.width, 160),
    maxWidth: 'min(320px, calc(100vw - 16px))',
    ...(above
      ? { bottom: dropdownPos.bottom }
      : { top: dropdownPos.top }),
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        id={id}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-all
          bg-zinc-100 text-zinc-950 border-zinc-300
          dark:bg-zinc-800 dark:text-white dark:border-zinc-700
          hover:border-zinc-400 dark:hover:border-zinc-600
          focus:outline-none
          ${open ? `${ACCENT[accent]} ring-2` : ''}
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {selected?.icon && (
          <img src={selected.icon} alt="" width={20} height={15} className="shrink-0 rounded-sm object-cover" aria-hidden />
        )}
        <span className="truncate text-left">{selected?.label ?? value}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown — rendered via portal so overflow:auto on modal doesn't clip it */}
      {open && typeof document !== 'undefined' && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby={id}
          style={dropdownStyle}
          className="z-[9999] max-h-52 overflow-y-auto rounded-xl border border-zinc-200/80 bg-white py-1 shadow-xl dark:border-zinc-700/80 dark:bg-zinc-900"
        >
          {options.map(opt => {
            const isActive = opt.value === value
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors text-left
                    hover:bg-zinc-50 dark:hover:bg-zinc-800/70
                    ${isActive ? `font-semibold ${ACCENT_ITEM[accent]} bg-zinc-50 dark:bg-zinc-800/50` : 'text-zinc-700 dark:text-zinc-300'}`}
                >
                  {opt.icon
                    ? <img src={opt.icon} alt="" width={20} height={15} className="shrink-0 rounded-sm object-cover" aria-hidden />
                    : isActive
                      ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0" aria-hidden><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>
                      : <span className="w-[1.375rem]" />
                  }
                  <span>{opt.label}</span>
                </button>
              </li>
            )
          })}
        </ul>,
        document.body
      )}
    </div>
  )
}
