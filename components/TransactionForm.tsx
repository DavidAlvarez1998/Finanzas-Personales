'use client'

import { useState, useEffect } from 'react'
import type { Transaction } from '@/types'
import { AmountInput } from './AmountInput'

interface Props {
  onSave: (t: Omit<Transaction, 'id'>) => void
  onClose: () => void
  editing?: Transaction | null
  initialType?: 'income' | 'expense'
}

const CURRENCIES = ['COP', 'BRL', 'USD']

export function TransactionForm({ onSave, onClose, editing, initialType = 'expense' }: Props) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'income' | 'expense'>(initialType)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('COP')

  useEffect(() => {
    if (editing) {
      setDate(editing.date)
      setDescription(editing.description)
      setType(editing.income ? 'income' : 'expense')
      setAmount(String(editing.income ?? editing.expense ?? ''))
      setCurrency(editing.currency ?? 'COP')
    }
  }, [editing])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!date || !description || isNaN(num) || num <= 0) return
    onSave({
      date,
      description: description.toUpperCase(),
      income: type === 'income' ? num : null,
      expense: type === 'expense' ? num : null,
      currency,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700/50 bg-zinc-900 p-6 shadow-2xl">
        <h2 className={`mb-5 text-lg font-bold ${type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {editing
            ? (type === 'income' ? 'Editar Ingreso' : 'Editar Egreso')
            : (type === 'income' ? 'Nuevo Ingreso' : 'Nuevo Egreso')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Salario semanal"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
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
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                Moneda
              </label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              >
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
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
  )
}
