'use client'

import { useState, useEffect } from 'react'
import type { Transaction } from '@/types'
import { AmountInput } from './AmountInput'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants/categories'
import { currencyLabel } from '@/lib/constants/currencies'
import { Select } from '@/components/ui/Select'

interface Props {
  onSave: (t: Omit<Transaction, 'id'>) => void
  onClose: () => void
  editing?: Transaction | null
  initialType?: 'income' | 'expense'
  currencies: string[]
}

export function TransactionForm({ onSave, onClose, editing, initialType = 'expense', currencies }: Props) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'income' | 'expense'>(initialType)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(() => currencies[0] ?? 'COP')
  const [category, setCategory] = useState('')

  useEffect(() => {
    if (editing) {
      setDate(editing.date.split('T')[0])
      setDescription(editing.description)
      setType(editing.income ? 'income' : 'expense')
      setAmount(String(editing.income ?? editing.expense ?? ''))
      setCurrency(editing.currency ?? currencies[0] ?? 'COP')
      setCategory(editing.category ?? '')
    }
  }, [editing])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!date || !description || isNaN(num) || num <= 0) return
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const originalTime = editing?.date.includes('T') ? editing.date.split('T')[1].slice(0, 8) : null
    const datetime = `${date}T${originalTime ?? `${hh}:${mm}:${ss}`}`

    onSave({
      date: datetime,
      description: description.toUpperCase(),
      income: type === 'income' ? num : null,
      expense: type === 'expense' ? num : null,
      currency,
      category: category || null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 sm:pb-0 dark:bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/60 bg-white shadow-2xl dark:border-zinc-700/50 dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <div className="max-h-[90svh] overflow-y-auto p-4 sm:p-6 [scrollbar-gutter:stable]">
        <h2 className={`mb-5 text-lg font-bold ${type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {editing
            ? (type === 'income' ? 'Editar Ingreso' : 'Editar Egreso')
            : (type === 'income' ? 'Nuevo Ingreso' : 'Nuevo Egreso')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Categoría <span className="normal-case text-zinc-600">(opcional)</span>
            </label>
            <Select
              value={category}
              onChange={setCategory}
              options={[
                { value: '', label: 'Sin categoría' },
                ...(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => ({ value: c, label: c })),
              ]}
              accent="sky"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Salario semanal"
              required
              className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                Monto
              </label>
              <AmountInput
                value={amount}
                onChange={setAmount}
                accent="sky"
                required
              />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                Divisa
              </label>
              <Select
                value={currency}
                onChange={setCurrency}
                options={currencies.map(c => ({ value: c, label: currencyLabel(c) }))}
                accent="sky"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 rounded-lg py-2 text-sm font-medium text-white transition-colors ${
                type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {editing ? 'Guardar Cambios' : 'Agregar'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
