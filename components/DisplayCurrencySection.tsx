'use client'

import { useState, useMemo } from 'react'
import { WORLD_CURRENCIES } from '@/lib/constants/currencies'

interface Props {
  initialValue: string | null
  onSave: (code: string | null) => void
  isSaving?: boolean
}

export function DisplayCurrencySection({ initialValue, onSave, isSaving }: Props) {
  const [selected, setSelected] = useState<string | null>(initialValue)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return WORLD_CURRENCIES
    return WORLD_CURRENCIES.filter(
      c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    )
  }, [search])

  const hasChanged = selected !== initialValue

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <p className="px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200/60 dark:border-zinc-800 shrink-0">
        Elegí una divisa para ver los totales del dashboard convertidos al tipo de cambio actual.
      </p>

      <div className="px-5 py-3 border-b border-zinc-200/60 dark:border-zinc-800 shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar divisa..."
          className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul>
          <li>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                selected === null ? 'bg-sky-50 dark:bg-sky-950/20' : ''
              }`}
            >
              <span className="text-xl leading-none">🚫</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-zinc-950 dark:text-white text-sm">Sin conversión</span>
                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">Mostrar en divisas originales</span>
              </div>
              <span
                className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                  selected === null
                    ? 'border-sky-500 bg-sky-500 text-white'
                    : 'border-zinc-300 bg-white text-transparent dark:border-zinc-600 dark:bg-zinc-800'
                }`}
                aria-hidden
              >
                ✓
              </span>
            </button>
          </li>
          {filtered.map(c => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => setSelected(c.code)}
                className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                  selected === c.code ? 'bg-sky-50 dark:bg-sky-950/20' : ''
                }`}
              >
                <span className="shrink-0 w-8 text-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{c.code.slice(0, 2)}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-zinc-950 dark:text-white text-sm">{c.code}</span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{c.name}</span>
                </div>
                <span
                  className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    selected === c.code
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-zinc-300 bg-white text-transparent dark:border-zinc-600 dark:bg-zinc-800'
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-5 py-4 border-t border-zinc-200/60 dark:border-zinc-800 shrink-0">
        <button
          type="button"
          onClick={() => onSave(selected)}
          disabled={!hasChanged || isSaving}
          className="w-full rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition-colors disabled:opacity-40"
        >
          {isSaving ? 'Guardando...' : 'Aplicar divisa'}
        </button>
      </div>
    </div>
  )
}
