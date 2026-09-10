'use client'

import { useState } from 'react'
import { AmountInput } from '@/components/AmountInput'
import type { SavingsGoal, SavingsGoalStatus, SavingsContribution } from '@/types'

interface Props {
  goals: SavingsGoal[]
  onAdd: (g: Omit<SavingsGoal, 'id'>) => void
  onUpdate: (g: SavingsGoal) => void
  onDelete: (id: string) => void
  onAddContribution: (goalId: string, fd: FormData) => void
  onDeleteContribution: (id: string) => void
  onUpdateStatus: (id: string, status: SavingsGoalStatus) => void
  isPending: boolean
  currencies: string[]
}

function ProgressBar({ pct, status }: { pct: number; status: SavingsGoalStatus }) {
  const clamped = Math.max(0, Math.min(pct, 100))
  const fill =
    status === 'completed'
      ? 'bg-emerald-500'
      : status === 'paused'
      ? 'bg-zinc-400 dark:bg-zinc-600'
      : 'bg-violet-600'
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div
        className={`h-full ${fill} transition-[width] duration-500`}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}

function formatCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}

export function SavingsSection({
  goals,
  onAdd,
  onUpdate,
  onDelete,
  onAddContribution,
  onDeleteContribution,
  onUpdateStatus,
  isPending,
  currencies,
}: Props) {
  // Goal form state
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [nombre, setNombre] = useState('')
  const [montoObjetivo, setMontoObjetivo] = useState('')
  const [currency, setCurrency] = useState('COP')

  // Goal delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Contribution form
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null)
  const [contribMonto, setContribMonto] = useState('')
  const [contribFecha, setContribFecha] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [contribNota, setContribNota] = useState('')

  // Accordion
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)

  // Contribution delete confirm
  const [deletingContribId, setDeletingContribId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setNombre('')
    setMontoObjetivo('')
    setCurrency('COP')
    setShowForm(true)
  }

  function openEdit(goal: SavingsGoal) {
    setEditing(goal)
    setNombre(goal.nombre)
    setMontoObjetivo(String(goal.monto_objetivo))
    setCurrency(goal.currency)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed: Omit<SavingsGoal, 'id'> = {
      nombre,
      monto_objetivo: parseFloat(montoObjetivo) || 0,
      currency,
      status: editing?.status ?? 'active',
    }
    if (editing) {
      onUpdate({ ...editing, ...parsed })
    } else {
      onAdd(parsed)
    }
    closeForm()
  }

  function openContribForm(goalId: string) {
    setContributingGoalId(goalId)
    setContribMonto('')
    setContribFecha(new Date().toISOString().split('T')[0])
    setContribNota('')
  }

  function closeContribForm() {
    setContributingGoalId(null)
  }

  function handleContribSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contributingGoalId) return
    const fd = new FormData()
    fd.set('monto', contribMonto)
    fd.set('fecha', contribFecha)
    if (contribNota.trim()) fd.set('nota', contribNota.trim())
    onAddContribution(contributingGoalId, fd)
    closeContribForm()
  }

  function toggleExpand(goalId: string) {
    setExpandedGoalId(prev => (prev === goalId ? null : goalId))
  }

  const activeCount = goals.filter(g => g.status === 'active').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
            Metas de Ahorro
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-bold text-white">
                {activeCount} activa{activeCount !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-500">Seguimiento de tus objetivos de ahorro</p>
        </div>
        <button
          onClick={openCreate}
          disabled={isPending}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors shadow-lg shadow-violet-900/30 disabled:opacity-50"
        >
          + Nueva Meta
        </button>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">No tenés metas de ahorro todavía.</p>
          <p className="mt-1 text-xs text-zinc-400">Creá una meta para empezar a hacer seguimiento.</p>
        </div>
      )}

      {/* Goals list */}
      {goals.map(goal => {
        const total = goal.total_aportado ?? 0
        const pct = goal.progress_pct ?? 0
        const rem = goal.remaining ?? goal.monto_objetivo
        const isExpanded = expandedGoalId === goal.id

        return (
          <div
            key={goal.id}
            className="rounded-xl border border-violet-300/60 bg-violet-50 dark:border-violet-900/30 dark:bg-violet-950/20 overflow-hidden"
          >
            {/* Card header — clickable to expand */}
            <div
              className="flex cursor-pointer items-center justify-between px-4 pt-4 pb-2"
              onClick={() => toggleExpand(goal.id)}
              role="button"
              aria-expanded={isExpanded}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-violet-900 dark:text-violet-200">
                  {goal.nombre}
                </span>
                {goal.status === 'completed' && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Completada
                  </span>
                )}
                {goal.status === 'paused' && (
                  <span className="rounded-full bg-zinc-500/20 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Pausada
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  {formatCurrency(goal.monto_objetivo, goal.currency)}
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

            {/* Progress bar */}
            <div className="px-4">
              <ProgressBar pct={pct} status={goal.status} />
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {formatCurrency(total, goal.currency)} / {formatCurrency(goal.monto_objetivo, goal.currency)}
                {' '}
                <span className="font-medium text-violet-700 dark:text-violet-400">
                  ({Math.round(pct)}%)
                </span>
              </span>
              <span>
                Restante: <span className="font-medium">{formatCurrency(rem, goal.currency)}</span>
              </span>
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <button
                onClick={e => { e.stopPropagation(); openContribForm(goal.id) }}
                disabled={isPending}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                + Aporte
              </button>
              <button
                onClick={e => { e.stopPropagation(); openEdit(goal) }}
                disabled={isPending}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Editar
              </button>
              <button
                onClick={e => { e.stopPropagation(); setDeletingId(goal.id) }}
                disabled={isPending}
                className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30 disabled:opacity-50"
              >
                Eliminar
              </button>
              {goal.status === 'active' && (goal.contributions?.length ?? 0) > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); onUpdateStatus(goal.id, 'paused') }}
                  disabled={isPending}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Pausar
                </button>
              )}
              {goal.status !== 'active' && (
                <button
                  onClick={e => { e.stopPropagation(); onUpdateStatus(goal.id, 'active') }}
                  disabled={isPending}
                  className="rounded-md border border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 transition-colors dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/30 disabled:opacity-50"
                >
                  Reanudar
                </button>
              )}
            </div>

            {/* Expandable contributions list */}
            {isExpanded && (
              <div className="border-t border-violet-200/60 dark:border-violet-900/20 px-4 py-3 space-y-2">
                {(goal.contributions?.length ?? 0) === 0 ? (
                  <p className="text-xs text-zinc-400">Sin aportes todavía.</p>
                ) : (
                  goal.contributions!.map((contrib: SavingsContribution) => (
                    <div
                      key={contrib.id}
                      className="flex items-center justify-between rounded-lg bg-white/60 dark:bg-zinc-900/40 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {contrib.fecha}
                        </span>
                        <span className="font-medium text-violet-800 dark:text-violet-300">
                          {formatCurrency(Number(contrib.monto), goal.currency)}
                        </span>
                        {contrib.nota && (
                          <span className="text-zinc-500 dark:text-zinc-400 italic">
                            {contrib.nota}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setDeletingContribId(contrib.id)}
                        disabled={isPending}
                        aria-label="Eliminar aporte"
                        className="text-zinc-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Goal create/edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6">
            <h3 className="mb-4 text-base font-semibold text-zinc-950 dark:text-white">
              {editing ? 'Editar Meta' : 'Nueva Meta de Ahorro'}
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
                  placeholder="Ej: Viaje a Europa"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-violet-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-violet-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Monto objetivo
                </label>
                <AmountInput
                  value={montoObjetivo}
                  onChange={setMontoObjetivo}
                  min={1}
                  required
                  accent="violet"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Moneda
                </label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 focus:border-violet-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-violet-500 disabled:opacity-50"
                >
                  {currencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
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
                  className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
                >
                  {editing ? 'Guardar cambios' : 'Crear meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goal delete confirm modal */}
      {deletingId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6 text-center">
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
              ¿Eliminar esta meta y todos sus aportes? Esta acción no se puede deshacer.
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

      {/* Contribution modal */}
      {contributingGoalId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6">
            <h3 className="mb-4 text-base font-semibold text-zinc-950 dark:text-white">
              Registrar Aporte
            </h3>
            <form onSubmit={handleContribSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Monto
                </label>
                <AmountInput
                  value={contribMonto}
                  onChange={setContribMonto}
                  min={1}
                  required
                  accent="violet"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Fecha
                </label>
                <input
                  type="date"
                  value={contribFecha}
                  onChange={e => setContribFecha(e.target.value)}
                  required
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 focus:border-violet-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-violet-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Nota (opcional)
                </label>
                <input
                  type="text"
                  value={contribNota}
                  onChange={e => setContribNota(e.target.value)}
                  disabled={isPending}
                  placeholder="Ej: Bono de fin de año"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-violet-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-violet-500 disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeContribForm}
                  disabled={isPending}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
                >
                  Guardar aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution delete confirm modal */}
      {deletingContribId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6 text-center">
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
              ¿Eliminar este aporte? El estado de la meta no cambiará automáticamente.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeletingContribId(null)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onDeleteContribution(deletingContribId); setDeletingContribId(null) }}
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
