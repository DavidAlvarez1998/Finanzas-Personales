'use client'

import { useState } from 'react'
import type { Debt } from '@/types'
import { AmountInput } from './AmountInput'
import { Select } from '@/components/ui/Select'
import { currencyLabel } from '@/lib/constants/currencies'

interface Props {
  debts: Debt[]
  onAdd: (d: Omit<Debt, 'id'>) => void
  onUpdate: (d: Debt) => void
  onDelete: (id: string) => void
  onPayment: (debtId: string, fd: FormData) => void
  isPending: boolean
  currencies: string[]
}

export function DebtSection({ debts, onAdd, onUpdate, onDelete, onPayment, isPending, currencies }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')

  function openNew() {
    setEditing(null)
    setDescription('')
    setAmount('')
    setCurrency('COP')
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
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">Deudas</h2>
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
        <div className="rounded-xl border border-zinc-200 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-600">
          No hay deudas registradas
        </div>
      ) : (
        <div className="space-y-2">
          {debts.map(d => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-y-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-950 break-words dark:text-white">{d.description}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{d.currency}</p>
                {d.remaining != null && (
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-zinc-500">
                    <span>Original: <span className="font-mono">${d.amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span></span>
                    <span>Abonado: <span className="font-mono text-emerald-600 dark:text-emerald-400">${(d.total_paid ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span></span>
                    <span>Restante: <span className="font-mono text-amber-600 dark:text-amber-400">${(d.remaining ?? d.amount).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span></span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-base font-bold text-amber-400">
                  {d.amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(d)}
                    disabled={isPending}
                    className={`rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors dark:hover:bg-zinc-700 dark:hover:text-white ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => { setPayingDebtId(d.id); setPayAmount(''); setPayNote('') }}
                    className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-emerald-100 hover:text-emerald-700 transition-colors dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
                  >
                    + Abonar
                  </button>
                  <button
                    onClick={() => setDeletingId(d.id)}
                    disabled={isPending}
                    className={`rounded px-2 py-1 text-xs text-zinc-500 hover:bg-rose-100/80 hover:text-rose-600 transition-colors dark:hover:bg-rose-900/50 dark:hover:text-rose-400 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 bg-black/50 backdrop-blur-sm dark:bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200/60 bg-white p-4 sm:p-6 shadow-2xl max-h-[90svh] overflow-y-auto dark:border-zinc-700/50 dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
            <h3 className="mb-5 text-lg font-bold text-zinc-950 dark:text-white">
              {editing ? 'Editar Deuda' : 'Nueva Deuda'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Descripción</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ej: Préstamo banco"
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Monto</label>
                  <AmountInput
                    value={amount}
                    onChange={setAmount}
                    accent="amber"
                    required
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Divisa</label>
                  <Select
                    value={currency}
                    onChange={setCurrency}
                    options={currencies.map(c => ({ value: c, label: currencyLabel(c) }))}
                    accent="amber"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={`flex-1 rounded-lg bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/60" onClick={() => setDeletingId(null)}>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl w-full max-w-xs mx-4 dark:border-zinc-700 dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">¿Eliminar esta deuda? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onDelete(deletingId); setDeletingId(null) }}
                disabled={isPending}
                className={`flex-1 rounded-lg bg-rose-700 py-2 text-sm font-medium text-white hover:bg-rose-600 transition-colors ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {payingDebtId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0 dark:bg-black/60 backdrop-blur-sm" onClick={() => setPayingDebtId(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-300 bg-white p-6 shadow-2xl max-h-[90svh] overflow-y-auto dark:border-zinc-700 dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-bold text-zinc-950 dark:text-white">Registrar Pago</h3>
            <form
              onSubmit={e => {
                e.preventDefault()
                const fd = new FormData()
                fd.set('amount', payAmount)
                fd.set('note', payNote)
                onPayment(payingDebtId, fd)
                setPayingDebtId(null)
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">Monto</label>
                <AmountInput value={payAmount} onChange={setPayAmount} accent="amber" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">Nota <span className="normal-case text-zinc-400">(opcional)</span></label>
                <input
                  type="text"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="Ej: Cuota enero"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setPayingDebtId(null)}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
