'use client'

import { useState, useEffect } from 'react'
import type { Transaction } from '@/types'
import { AmountInput } from './AmountInput'

interface Props {
  onSave: (t: Omit<Transaction, 'id'>) => void
  onClose: () => void
  editing?: Transaction | null
}

export function TransactionForm({ onSave, onClose, editing }: Props) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (editing) {
      setDate(editing.date)
      setDescription(editing.description)
      setType(editing.income ? 'income' : 'expense')
      setAmount(String(editing.income ?? editing.expense ?? ''))
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
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700/50 bg-zinc-900 p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-bold text-white">
          {editing ? 'Editar Registro' : 'Nuevo Registro'}
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

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Tipo
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Ingreso
              </button>
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  type === 'expense'
                    ? 'bg-rose-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Egreso
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Monto ($)
            </label>
            <AmountInput
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              step={0.01}
              accent="sky"
              required
            />
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
              className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
            >
              {editing ? 'Guardar Cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
