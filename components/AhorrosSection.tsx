'use client'

import { useState } from 'react'
import { AmountInput } from '@/components/AmountInput'
import { Select } from '@/components/ui/Select'
import { currencyLabel, currencyFlagUrl } from '@/lib/constants/currencies'
import { formatAmount } from '@/lib/format'
import type { AhorroAccount, AhorroMovimiento, AhorroAccountStatus } from '@/types'

interface Props {
  accounts: AhorroAccount[]
  onAdd: (fd: FormData) => void
  onUpdate: (id: string, fd: FormData) => void
  onDelete: (id: string) => void
  onAddMovimiento: (accountId: string, fd: FormData) => void
  onDeleteMovimiento: (id: string) => void
  onUpdateStatus: (id: string, status: AhorroAccountStatus) => void
  isPending: boolean
  currencies: string[]
}

function formatCurrency(amount: number, currency: string) {
  return `${currency} ${formatAmount(amount)}`
}

export function AhorrosSection({
  accounts,
  onAdd,
  onUpdate,
  onDelete,
  onAddMovimiento,
  onDeleteMovimiento,
  onUpdateStatus,
  isPending,
  currencies,
}: Props) {
  // Account form state
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AhorroAccount | null>(null)
  const [nombre, setNombre] = useState('')
  const [currency, setCurrency] = useState(() => currencies[0] ?? 'COP')

  // Account delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Movimiento form
  const [movimientoAccountId, setMovimientoAccountId] = useState<string | null>(null)
  const [movType, setMovType] = useState<'deposito' | 'retiro'>('deposito')
  const [movMonto, setMovMonto] = useState('')
  const [movFecha, setMovFecha] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [movNota, setMovNota] = useState('')

  // Accordion
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null)

  // Movimiento delete confirm
  const [deletingMovId, setDeletingMovId] = useState<string | null>(null)

  // Show archived toggle
  const [showArchived, setShowArchived] = useState(false)

  function openCreate() {
    setEditing(null)
    setNombre('')
    setCurrency(currencies[0] ?? 'COP')
    setShowForm(true)
  }

  function openEdit(account: AhorroAccount) {
    setEditing(account)
    setNombre(account.nombre)
    setCurrency(account.currency)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('nombre', nombre)
    fd.set('currency', currency)
    if (editing) {
      onUpdate(editing.id, fd)
    } else {
      onAdd(fd)
    }
    closeForm()
  }

  function openMovimientoForm(accountId: string) {
    setMovimientoAccountId(accountId)
    setMovType('deposito')
    setMovMonto('')
    setMovFecha(new Date().toISOString().split('T')[0])
    setMovNota('')
  }

  function closeMovimientoForm() {
    setMovimientoAccountId(null)
  }

  function handleMovimientoSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!movimientoAccountId) return
    const unsigned = parseFloat(movMonto) || 0
    const signed = movType === 'retiro' ? -unsigned : unsigned
    const fd = new FormData()
    fd.set('monto', String(signed))
    fd.set('fecha', movFecha)
    if (movNota.trim()) fd.set('nota', movNota.trim())
    onAddMovimiento(movimientoAccountId, fd)
    closeMovimientoForm()
  }

  function toggleExpand(accountId: string) {
    setExpandedAccountId(prev => (prev === accountId ? null : accountId))
  }

  const activeAccounts = accounts.filter(a => a.status === 'active')
  const archivedAccounts = accounts.filter(a => a.status === 'archived')
  const visibleAccounts = showArchived ? accounts : activeAccounts

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
            Cuentas de Ahorro
            {activeAccounts.length > 0 && (
              <span className="ml-2 rounded-full bg-sky-600 px-2 py-0.5 text-xs font-bold text-white">
                {activeAccounts.length} activa{activeAccounts.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-500">Seguimiento de tus ahorros</p>
        </div>
        <button
          onClick={openCreate}
          disabled={isPending}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition-colors shadow-lg shadow-sky-900/30 disabled:opacity-50"
        >
          + Nueva Cuenta
        </button>
      </div>

      {/* Empty state */}
      {accounts.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">No tenés cuentas de ahorro todavía.</p>
          <p className="mt-1 text-xs text-zinc-400">Creá una cuenta para empezar a registrar tus ahorros.</p>
        </div>
      )}

      {/* Archived toggle */}
      {archivedAccounts.length > 0 && (
        <button
          onClick={() => setShowArchived(prev => !prev)}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          {showArchived
            ? `Ocultar archivadas (${archivedAccounts.length})`
            : `Mostrar archivadas (${archivedAccounts.length})`}
        </button>
      )}

      {/* Accounts list */}
      {visibleAccounts.map(account => {
        const total = account.total_actual ?? 0
        const isExpanded = expandedAccountId === account.id
        const isArchived = account.status === 'archived'

        return (
          <div
            key={account.id}
            className={`rounded-xl border overflow-hidden transition-opacity ${
              isArchived
                ? 'border-zinc-200/60 bg-zinc-50 dark:border-zinc-800/30 dark:bg-zinc-900/20 opacity-60'
                : 'border-sky-300/60 bg-sky-50 dark:border-sky-900/30 dark:bg-sky-950/20'
            }`}
          >
            {/* Card header — clickable to expand */}
            <div
              className="flex cursor-pointer items-center justify-between px-4 pt-4 pb-2"
              onClick={() => toggleExpand(account.id)}
              role="button"
              aria-expanded={isExpanded}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className={`min-w-0 truncate font-semibold ${isArchived ? 'text-zinc-500 dark:text-zinc-400' : 'text-sky-900 dark:text-sky-200'}`}>
                  {account.nombre}
                </span>
                {isArchived && (
                  <span className="rounded-full bg-zinc-500/20 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Archivada
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold tabular-nums ${total < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-sky-700 dark:text-sky-300'}`}>
                  {formatCurrency(total, account.currency)}
                </span>
                <svg
                  className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
              {!isArchived && (
                <button
                  onClick={e => { e.stopPropagation(); openMovimientoForm(account.id) }}
                  disabled={isPending}
                  className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 transition-colors disabled:opacity-50"
                >
                  + Movimiento
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); openEdit(account) }}
                disabled={isPending}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Editar
              </button>
              <button
                onClick={e => { e.stopPropagation(); setDeletingId(account.id) }}
                disabled={isPending}
                className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30 disabled:opacity-50"
              >
                Eliminar
              </button>
              {!isArchived && (
                <button
                  onClick={e => { e.stopPropagation(); onUpdateStatus(account.id, 'archived') }}
                  disabled={isPending}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Archivar
                </button>
              )}
              {isArchived && (
                <button
                  onClick={e => { e.stopPropagation(); onUpdateStatus(account.id, 'active') }}
                  disabled={isPending}
                  className="rounded-md border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 transition-colors dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-950/30 disabled:opacity-50"
                >
                  Reactivar
                </button>
              )}
            </div>

            {/* Expandable movimientos list */}
            {isExpanded && (
              <div className="border-t border-sky-200/60 dark:border-sky-900/20 px-4 py-3 space-y-2">
                {(account.movimientos?.length ?? 0) === 0 ? (
                  <p className="text-xs text-zinc-400">Sin movimientos todavía.</p>
                ) : (
                  account.movimientos!.map((mov: AhorroMovimiento) => {
                    const isDeposit = Number(mov.monto) >= 0
                    return (
                      <div
                        key={mov.id}
                        className="flex items-center justify-between rounded-lg bg-white/60 dark:bg-zinc-900/40 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                            {mov.fecha}
                          </span>
                          <span className={`font-medium tabular-nums ${isDeposit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                            {isDeposit ? '+' : '−'} {formatCurrency(Math.abs(Number(mov.monto)), account.currency)}
                          </span>
                          {mov.nota && (
                            <span className="text-zinc-500 dark:text-zinc-400 italic">
                              {mov.nota}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setDeletingMovId(mov.id)}
                          disabled={isPending}
                          aria-label="Eliminar movimiento"
                          className="text-zinc-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Account create/edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={closeForm}>
          <div className="animate-modal w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-semibold text-zinc-950 dark:text-white">
              {editing ? 'Editar Cuenta' : 'Nueva Cuenta de Ahorro'}
            </h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Nombre
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                  disabled={isPending}
                  placeholder="Ej: Ahorro dólares"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-sky-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Divisa
                </label>
                <Select
                  value={currency}
                  onChange={setCurrency}
                  options={currencies.map(c => ({ value: c, label: currencyLabel(c), icon: currencyFlagUrl(c) }))}
                  accent="sky"
                  disabled={isPending}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isPending}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition-colors disabled:opacity-50"
                >
                  {editing ? 'Guardar cambios' : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account delete confirm modal */}
      {deletingId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setDeletingId(null)}>
          <div className="animate-modal w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6 text-center" onClick={e => e.stopPropagation()}>
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
              ¿Eliminar esta cuenta y todos sus movimientos? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeletingId(null)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onDelete(deletingId); setDeletingId(null) }}
                disabled={isPending}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movimiento modal */}
      {movimientoAccountId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={closeMovimientoForm}>
          <div className="animate-modal w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-semibold text-zinc-950 dark:text-white">
              Registrar Movimiento
            </h3>
            <form onSubmit={handleMovimientoSubmit} className="space-y-4">
              {/* Depósito / Retiro toggle */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Tipo
                </label>
                <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMovType('deposito')}
                    disabled={isPending}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      movType === 'deposito'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    Depósito
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovType('retiro')}
                    disabled={isPending}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      movType === 'retiro'
                        ? 'bg-rose-600 text-white'
                        : 'bg-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    Retiro
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Monto
                </label>
                <AmountInput
                  value={movMonto}
                  onChange={setMovMonto}
                  decimals={2}
                  min={0.01}
                  required
                  accent="sky"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Fecha
                </label>
                <input
                  type="date"
                  value={movFecha}
                  onChange={e => setMovFecha(e.target.value)}
                  required
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Nota (opcional)
                </label>
                <input
                  type="text"
                  value={movNota}
                  onChange={e => setMovNota(e.target.value)}
                  disabled={isPending}
                  placeholder="Ej: Sueldo de octubre"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-sky-500 disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeMovimientoForm}
                  disabled={isPending}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition-colors disabled:opacity-50"
                >
                  Guardar movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movimiento delete confirm modal */}
      {deletingMovId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setDeletingMovId(null)}>
          <div className="animate-modal w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6 text-center" onClick={e => e.stopPropagation()}>
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
              ¿Eliminar este movimiento? El balance de la cuenta se actualizará.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeletingMovId(null)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onDeleteMovimiento(deletingMovId); setDeletingMovId(null) }}
                disabled={isPending}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
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
