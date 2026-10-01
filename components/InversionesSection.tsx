'use client'

import { useState } from 'react'
import { AmountInput } from '@/components/AmountInput'
import { Select } from '@/components/ui/Select'
import { currencyLabel, currencyFlagUrl } from '@/lib/constants/currencies'
import { formatAmount } from '@/lib/format'
import type { Investment, InvestmentReturn, InvestmentStatus, ReturnPeriod } from '@/types'

interface Props {
  investments: Investment[]
  onCreateInvestment: (payload: Record<string, unknown>) => void
  onUpdateInvestment: (id: string, payload: Record<string, unknown>) => void
  onDeleteInvestment: (id: string) => void
  onUpdateStatus: (id: string, status: InvestmentStatus) => void
  onAddReturn: (investmentId: string, payload: Record<string, unknown>) => void
  onDeleteReturn: (id: string) => void
  isPending: boolean
  currencies: string[]
}

const PERIOD_LABELS: Record<ReturnPeriod, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  annual: 'Anual',
  one_time: 'Único',
  custom: 'Personalizado',
}

const PERIOD_OPTIONS: { value: ReturnPeriod; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'one_time', label: 'Único' },
  { value: 'custom', label: 'Personalizado' },
]

function formatCurrency(amount: number, currency: string) {
  return `${currency} ${formatAmount(amount)}`
}

/** Days in one period for forecast math */
function periodDays(period: ReturnPeriod): number {
  switch (period) {
    case 'weekly': return 7
    case 'monthly': return 30.4375
    case 'quarterly': return 91.3125
    case 'annual': return 365.25
    case 'one_time': return 365.25
    default: return 365.25
  }
}

interface ForecastData {
  projectedTotal: number
  totalEarned: number
  roiPct: number
  daysToMaturity: number | null
  fechaVencimientoFormatted: string | null
}

function computeForecast(inv: Investment): ForecastData | null {
  if (inv.tasa_esperada == null || inv.periodo_retorno === 'custom') return null

  const today = new Date()
  const rate = Number(inv.tasa_esperada) / 100
  const principal = Number(inv.principal)
  const totalEarned = inv.total_retornos ?? 0
  const roiPct = inv.roi_pct ?? 0

  let periodsRemaining: number
  let daysToMaturity: number | null = null
  let fechaVencimientoFormatted: string | null = null

  if (inv.fecha_vencimiento) {
    const maturity = new Date(inv.fecha_vencimiento)
    const diffMs = maturity.getTime() - today.getTime()
    const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24))
    daysToMaturity = Math.ceil(diffDays)
    fechaVencimientoFormatted = maturity.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const pDays = periodDays(inv.periodo_retorno)
    periodsRemaining = inv.periodo_retorno === 'one_time' ? 1 : Math.max(1, diffDays / pDays)
  } else {
    periodsRemaining = inv.periodo_retorno === 'one_time' ? 1 : 12
  }

  const projectedTotal = principal * Math.pow(1 + rate, periodsRemaining)

  return { projectedTotal, totalEarned, roiPct, daysToMaturity, fechaVencimientoFormatted }
}

export function InversionesSection({
  investments,
  onCreateInvestment,
  onUpdateInvestment,
  onDeleteInvestment,
  onUpdateStatus,
  onAddReturn,
  onDeleteReturn,
  isPending,
  currencies,
}: Props) {
  // Investment form state
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [nombre, setNombre] = useState('')
  const [principal, setPrincipal] = useState('')
  const [currency, setCurrency] = useState(() => currencies[0] ?? 'COP')
  const [fechaInicio, setFechaInicio] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [tasaEsperada, setTasaEsperada] = useState('')
  const [periodoRetorno, setPeriodoRetorno] = useState<ReturnPeriod>('monthly')
  const [descripcion, setDescripcion] = useState('')

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Return form
  const [returnInvestmentId, setReturnInvestmentId] = useState<string | null>(null)
  const [returnMonto, setReturnMonto] = useState('')
  const [returnFecha, setReturnFecha] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [returnNota, setReturnNota] = useState('')

  // Return delete confirm
  const [deletingReturnId, setDeletingReturnId] = useState<string | null>(null)

  // Accordion
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setNombre('')
    setPrincipal('')
    setCurrency(currencies[0] ?? 'COP')
    setFechaInicio(new Date().toISOString().split('T')[0])
    setFechaVencimiento('')
    setTasaEsperada('')
    setPeriodoRetorno('monthly')
    setDescripcion('')
    setShowForm(true)
  }

  function openEdit(inv: Investment) {
    setEditing(inv)
    setNombre(inv.nombre)
    setPrincipal(String(inv.principal))
    setCurrency(inv.currency)
    setFechaInicio(inv.fecha_inicio)
    setFechaVencimiento(inv.fecha_vencimiento ?? '')
    setTasaEsperada(inv.tasa_esperada != null ? String(inv.tasa_esperada) : '')
    setPeriodoRetorno(inv.periodo_retorno)
    setDescripcion(inv.descripcion ?? '')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      nombre,
      principal: parseFloat(principal) || 0,
      currency,
      fecha_inicio: fechaInicio,
      fecha_vencimiento: fechaVencimiento.trim() || null,
      tasa_esperada: tasaEsperada.trim() ? parseFloat(tasaEsperada) : null,
      periodo_retorno: periodoRetorno,
      descripcion: descripcion.trim() || null,
    }
    if (editing) {
      onUpdateInvestment(editing.id, payload)
    } else {
      onCreateInvestment({ ...payload, id: crypto.randomUUID() })
    }
    closeForm()
  }

  function openReturnForm(investmentId: string) {
    setReturnInvestmentId(investmentId)
    setReturnMonto('')
    setReturnFecha(new Date().toISOString().split('T')[0])
    setReturnNota('')
  }

  function closeReturnForm() {
    setReturnInvestmentId(null)
  }

  function handleReturnSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!returnInvestmentId) return
    onAddReturn(returnInvestmentId, {
      id: crypto.randomUUID(),
      monto: parseFloat(returnMonto) || 0,
      fecha: returnFecha,
      nota: returnNota.trim() || null,
    })
    closeReturnForm()
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const activeCount = investments.filter(i => i.status === 'active').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
            Inversiones
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                {activeCount} activa{activeCount !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-500">Seguimiento de tus inversiones y retornos</p>
        </div>
        <button
          onClick={openCreate}
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30 disabled:opacity-50"
        >
          + Nueva inversión
        </button>
      </div>

      {/* Empty state */}
      {investments.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">No tenés inversiones todavía.</p>
          <p className="mt-1 text-xs text-zinc-400">Creá una inversión para empezar a hacer seguimiento.</p>
        </div>
      )}

      {/* Investments list */}
      {investments.map(inv => {
        const isExpanded = expandedId === inv.id
        const totalRetornos = inv.total_retornos ?? 0
        const roiPct = inv.roi_pct ?? 0
        const forecast = computeForecast(inv)

        const statusBadge =
          inv.status === 'active'
            ? { label: 'Activa', cls: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' }
            : inv.status === 'completed'
            ? { label: 'Completada', cls: 'bg-slate-400/20 text-slate-600 dark:text-slate-400' }
            : { label: 'Retirada', cls: 'bg-rose-500/20 text-rose-700 dark:text-rose-400' }

        return (
          <div
            key={inv.id}
            className="rounded-xl border border-emerald-300/60 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20 overflow-hidden"
          >
            {/* Card header — clickable to expand */}
            <div
              className="flex cursor-pointer items-center justify-between px-4 pt-4 pb-2"
              onClick={() => toggleExpand(inv.id)}
              role="button"
              aria-expanded={isExpanded}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="min-w-0 truncate font-semibold text-emerald-900 dark:text-emerald-200">
                  {inv.nombre}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.cls}`}>
                  {statusBadge.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(inv.principal, inv.currency)}
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

            {/* Stats row */}
            <div className="flex flex-col gap-0.5 px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <span>
                Principal: <span className="font-medium text-emerald-800 dark:text-emerald-300">{formatCurrency(inv.principal, inv.currency)}</span>
              </span>
              <span>
                Ganado: <span className="font-medium text-emerald-700 dark:text-emerald-400">{formatCurrency(totalRetornos, inv.currency)}</span>
                {' · '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">ROI {formatAmount(roiPct)}%</span>
              </span>
              {inv.periodo_retorno && (
                <span>{PERIOD_LABELS[inv.periodo_retorno]}</span>
              )}
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <button
                onClick={e => { e.stopPropagation(); openReturnForm(inv.id) }}
                disabled={isPending}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                + Agregar retorno
              </button>
              <button
                onClick={e => { e.stopPropagation(); openEdit(inv) }}
                disabled={isPending}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Editar
              </button>
              <button
                onClick={e => { e.stopPropagation(); setDeletingId(inv.id) }}
                disabled={isPending}
                className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30 disabled:opacity-50"
              >
                Eliminar
              </button>
              {inv.status === 'active' && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); onUpdateStatus(inv.id, 'completed') }}
                    disabled={isPending}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900/30 disabled:opacity-50"
                  >
                    Marcar como completada
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onUpdateStatus(inv.id, 'withdrawn') }}
                    disabled={isPending}
                    className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30 disabled:opacity-50"
                  >
                    Retirar
                  </button>
                </>
              )}
            </div>

            {/* Expandable returns list + forecast */}
            {isExpanded && (
              <div className="border-t border-emerald-200/60 dark:border-emerald-900/20 px-4 py-3 space-y-3">
                {/* Returns */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Retornos registrados</p>
                  {(inv.returns?.length ?? 0) === 0 ? (
                    <p className="text-xs text-zinc-400">Sin retornos registrados todavía.</p>
                  ) : (
                    (inv.returns ?? []).map((ret: InvestmentReturn) => (
                      <div
                        key={ret.id}
                        className="flex items-center justify-between rounded-lg bg-white/60 dark:bg-zinc-900/40 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">{ret.fecha}</span>
                          <span className="font-medium text-emerald-800 dark:text-emerald-300">
                            {formatCurrency(Number(ret.monto), inv.currency)}
                          </span>
                          {ret.nota && (
                            <span className="text-zinc-500 dark:text-zinc-400 italic">{ret.nota}</span>
                          )}
                        </div>
                        <button
                          onClick={() => setDeletingReturnId(ret.id)}
                          disabled={isPending}
                          aria-label="Eliminar retorno"
                          className="text-zinc-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Forecast card */}
                {forecast && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/40 dark:bg-emerald-950/40 px-4 py-3 space-y-1.5">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Proyección</p>
                    <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                      <span>
                        Proyectado:{' '}
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(forecast.projectedTotal, inv.currency)}
                        </span>
                      </span>
                      <span>
                        Ya ganado:{' '}
                        <span className="font-medium">{formatCurrency(forecast.totalEarned, inv.currency)}</span>
                        {' '}
                        <span className="text-emerald-600 dark:text-emerald-400">({formatAmount(forecast.roiPct)}%)</span>
                      </span>
                      {forecast.fechaVencimientoFormatted ? (
                        <span>
                          Vencimiento:{' '}
                          <span className="font-medium">{forecast.fechaVencimientoFormatted}</span>
                          {forecast.daysToMaturity !== null && (
                            <span className="text-zinc-400"> ({forecast.daysToMaturity} días)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-zinc-400">Sin fecha de vencimiento</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Investment create/edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={closeForm}>
          <div className="animate-modal w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-semibold text-zinc-950 dark:text-white">
              {editing ? 'Editar Inversión' : 'Nueva Inversión'}
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
                  placeholder="Ej: Plazo fijo Banco XYZ"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Capital inicial
                </label>
                <AmountInput
                  value={principal}
                  onChange={setPrincipal}
                  decimals={2}
                  min={1}
                  required
                  accent="sky"
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
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  required
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Fecha de vencimiento <span className="text-zinc-400">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={e => setFechaVencimiento(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Tasa esperada % <span className="text-zinc-400">(opcional)</span>
                </label>
                <input
                  type="number"
                  value={tasaEsperada}
                  onChange={e => setTasaEsperada(e.target.value)}
                  min={0}
                  step="any"
                  disabled={isPending}
                  placeholder="Ej: 12.5"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Período de retorno
                </label>
                <Select
                  value={periodoRetorno}
                  onChange={v => setPeriodoRetorno(v as ReturnPeriod)}
                  options={PERIOD_OPTIONS}
                  accent="sky"
                  disabled={isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Descripción <span className="text-zinc-400">(opcional)</span>
                </label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Ej: Plazo fijo 30 días renovable"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-emerald-500 disabled:opacity-50 resize-none"
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
                  className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {editing ? 'Guardar cambios' : 'Crear inversión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Investment delete confirm modal */}
      {deletingId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setDeletingId(null)}>
          <div className="animate-modal w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6 text-center" onClick={e => e.stopPropagation()}>
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
              ¿Eliminar esta inversión y todos sus retornos? Esta acción no se puede deshacer.
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
                onClick={() => { onDeleteInvestment(deletingId); setDeletingId(null) }}
                disabled={isPending}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add return modal */}
      {returnInvestmentId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={closeReturnForm}>
          <div className="animate-modal w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-semibold text-zinc-950 dark:text-white">
              Registrar Retorno
            </h3>
            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Monto
                </label>
                <AmountInput
                  value={returnMonto}
                  onChange={setReturnMonto}
                  decimals={2}
                  min={1}
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
                  value={returnFecha}
                  onChange={e => setReturnFecha(e.target.value)}
                  required
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Nota <span className="text-zinc-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={returnNota}
                  onChange={e => setReturnNota(e.target.value)}
                  disabled={isPending}
                  placeholder="Ej: Interés mensual"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeReturnForm}
                  disabled={isPending}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  Guardar retorno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return delete confirm modal */}
      {deletingReturnId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setDeletingReturnId(null)}>
          <div className="animate-modal w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 p-6 text-center" onClick={e => e.stopPropagation()}>
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
              ¿Eliminar este retorno? Los totales de la inversión se recalcularán automáticamente.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeletingReturnId(null)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onDeleteReturn(deletingReturnId); setDeletingReturnId(null) }}
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
