'use client'

import { useState, useMemo, useTransition } from 'react'
import { WORLD_CURRENCIES } from '@/lib/constants/currencies'
import { updateUserCurrencies, updateDisplayCurrency } from '@/app/actions/currencies'
import { DisplayCurrencySection } from '@/components/DisplayCurrencySection'

type Tab = 'currencies' | 'display'

interface Props {
  selected: string[]
  displayCurrency: string | null
  onClose: () => void
  onDisplayCurrencyChange: (code: string | null) => void
}

export function CurrencyPicker({ selected, displayCurrency, onClose, onDisplayCurrencyChange }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('currencies')
  const [localSelected, setLocalSelected] = useState<string[]>(selected)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isDisplaySaving, setIsDisplaySaving] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return WORLD_CURRENCIES
    return WORLD_CURRENCIES.filter(
      c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    )
  }, [search])

  function toggle(code: string) {
    setLocalSelected(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  function handleSaveCurrencies() {
    startTransition(async () => {
      await updateUserCurrencies(localSelected)
      onClose()
    })
  }

  async function handleSaveDisplayCurrency(code: string | null) {
    setIsDisplaySaving(true)
    await updateDisplayCurrency(code)
    onDisplayCurrencyChange(code)
    setIsDisplaySaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200/60 bg-white shadow-2xl dark:border-zinc-700/50 dark:bg-zinc-900 flex flex-col max-h-[85svh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800 shrink-0">
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">Configuración</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200/60 dark:border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('currencies')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'currencies'
                ? 'border-b-2 border-sky-500 text-sky-600 dark:text-sky-400'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Divisas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('display')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'display'
                ? 'border-b-2 border-sky-500 text-sky-600 dark:text-sky-400'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Visualización
          </button>
        </div>

        {activeTab === 'currencies' ? (
          <>
            {/* Search */}
            <div className="px-5 py-3 border-b border-zinc-200/60 dark:border-zinc-800 shrink-0">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar divisa..."
                className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-400 dark:text-zinc-600">Sin resultados</p>
              ) : (
                <ul>
                  {filtered.map(c => {
                    const active = localSelected.includes(c.code)
                    return (
                      <li key={c.code}>
                        <button
                          type="button"
                          onClick={() => toggle(c.code)}
                          className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                            active ? 'bg-sky-50 dark:bg-sky-950/20' : ''
                          }`}
                        >
                          <span className="shrink-0 w-8 text-center text-xl leading-none">{c.flag}</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-zinc-950 dark:text-white text-sm">{c.code}</span>
                            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{c.name}</span>
                          </div>
                          <span
                            className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors ${
                              active
                                ? 'border-sky-500 bg-sky-500 text-white'
                                : 'border-zinc-300 bg-white text-transparent dark:border-zinc-600 dark:bg-zinc-800'
                            }`}
                            aria-hidden
                          >
                            ✓
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-zinc-200/60 dark:border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCurrencies}
                disabled={isPending}
                className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </>
        ) : (
          <DisplayCurrencySection
            initialValue={displayCurrency}
            onSave={handleSaveDisplayCurrency}
            isSaving={isDisplaySaving}
          />
        )}
      </div>
    </div>
  )
}
