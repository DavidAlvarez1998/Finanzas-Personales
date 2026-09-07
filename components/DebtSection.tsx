'use client'

import { useState } from 'react'
import type { Debt } from '@/types'

interface Props {
  debts: Debt[]
  onAdd: (d: Omit<Debt, 'id'>) => void
  onUpdate: (d: Debt) => void
  onDelete: (id: string) => void
}

const CURRENCIES = ['USD', 'ARS', 'BRL', 'EUR']

export function DebtSection({ debts, onAdd, onUpdate, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('ARS')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setDescription('')
    setAmount('')
    setCurrency('ARS')
    setShowForm(true)
  }

  function openEdit(d: Debt) {
    setEditing(d)
    setDescription(d.description)
    // amount is now a number — convert to string for the input
    setAmount(String(d.amount))
    setCurrency(d.currency)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description || !amount) return
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) return

    if (editing) {
      onUpdate({
        ...editing,
        description: description.toUpperCase(),
        amount: parsedAmount,
        currency,
      })
    } else {
      onAdd({
        description: description.toUpperCase(),
        amount: parsedAmount,
        currency,
      })
    }
    setShowForm(false)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Deudas</h2>
          <p className="text-xs text-zinc-500">{debts.length} deuda{debts.length !== 1 ? 's' : ''} registrada{debts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 transition-colors"
        >
          + Nueva Deuda
        </button>
      </div>

      {debts.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-10 text-center text-sm text-zinc-600">
          No hay deudas registradas
        </div>
      ) : (
        <div className="space-y-2">
          {debts.map(d => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-y-2 rounded-xl border border-amber-900/30 bg-amber-950/20 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white break-words">{d.description}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{d.currency}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-base font-bold text-amber-400">
                  {d.amount.toLocaleString('es-AR')}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(d)}
                    className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeletingId(d.id)}
                    className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-rose-900/50 hover:text-rose-400 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700/50 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="mb-5 text-lg font-bold text-white">
              {editing ? 'Editar Deuda' : 'Nueva Deuda'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">Descripción</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ej: Préstamo banco"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">Monto</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="any"
                    required
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">Moneda</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  >
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
                >
                  {editing ? 'Guardar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl w-full max-w-xs mx-4">
            <p className="mb-4 text-sm text-zinc-300">¿Eliminar esta deuda? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onDelete(deletingId); setDeletingId(null) }}
                className="flex-1 rounded-lg bg-rose-700 py-2 text-sm font-medium text-white hover:bg-rose-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
