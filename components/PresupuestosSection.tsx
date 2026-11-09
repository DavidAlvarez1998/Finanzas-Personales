'use client'

import { useState, memo, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Presupuesto, PresupuestoItem, Transaction } from '@/types'
import { AmountInput } from './AmountInput'
import { Select } from '@/components/ui/Select'
import { currencyLabel, currencyFlagUrl } from '@/lib/constants/currencies'
import { formatAmount } from '@/lib/format'
import dynamic from 'next/dynamic'

const PresupuestoVsRealChart = dynamic(
  () => import('@/components/charts/PresupuestoVsRealChart').then(m => m.PresupuestoVsRealChart),
  { ssr: false, loading: () => null }
)

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface Props {
  presupuestos: Presupuesto[]
  transactions: Transaction[]
  onCreate: (p: { nombre: string; total: number; currency: string; mes: number; anio: number }) => void
  onUpdate: (id: string, p: { nombre: string; total: number; currency: string; mes: number; anio: number }) => void
  onDelete: (id: string) => void
  onCreateItem: (presupuestoId: string, item: { nombre: string; monto: number; category?: string | null }) => void
  onUpdateItem: (itemId: string, item: { nombre: string; monto: number; category?: string | null }) => void
  onDeleteItem: (itemId: string) => void
  isPending: boolean
  currencies: string[]
}

function PresupuestosSectionImpl({
  presupuestos,
  transactions,
  onCreate,
  onUpdate,
  onDelete,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  isPending,
  currencies,
}: Props) {
  const now = new Date()

  // ── Period selection ──────────────────────────────────────────────────
  const [selectedMes, setSelectedMes] = useState(now.getMonth() + 1)
  const [selectedAnio, setSelectedAnio] = useState(now.getFullYear())

  function prevPeriod() {
    if (selectedMes === 1) {
      setSelectedMes(12)
      setSelectedAnio(a => a - 1)
    } else {
      setSelectedMes(m => m - 1)
    }
  }
  function nextPeriod() {
    if (selectedMes === 12) {
      setSelectedMes(1)
      setSelectedAnio(a => a + 1)
    } else {
      setSelectedMes(m => m + 1)
    }
  }

  // ── Presupuesto form modal state ──────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Presupuesto | null>(null)
  const [nombre, setNombre] = useState('')
  const [total, setTotal] = useState('')
  const [currency, setCurrency] = useState(() => currencies[0] ?? 'COP')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Item modal state ──────────────────────────────────────────────────
  const [itemModalFor, setItemModalFor] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<PresupuestoItem | null>(null)
  const [itemNombre, setItemNombre] = useState('')
  const [itemMonto, setItemMonto] = useState('')
  const [itemCategory, setItemCategory] = useState('')
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  // ── Period-filtered presupuestos ──────────────────────────────────────
  const filteredPresupuestos = useMemo(
    () => presupuestos.filter(p => p.mes === selectedMes && p.anio === selectedAnio),
    [presupuestos, selectedMes, selectedAnio]
  )

  // ── Category datalist from transactions in selected period ────────────
  const periodPrefix = `${selectedAnio}-${String(selectedMes).padStart(2, '0')}`
  const periodCategories = useMemo(
    () =>
      [...new Set(
        transactions
          .filter(tx => tx.date.startsWith(periodPrefix) && tx.category)
          .map(tx => tx.category!)
      )].sort(),
    [transactions, periodPrefix]
  )

  // ── Tooltip style (read CSS vars) ─────────────────────────────────────
  const tooltipStyle: React.CSSProperties = {
    background: 'var(--color-zinc-900, #18181b)',
    border: '1px solid var(--color-zinc-700, #3f3f46)',
    borderRadius: 8,
    color: 'var(--color-zinc-100, #f4f4f5)',
    fontSize: 12,
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  function computeGastado(item: PresupuestoItem, presupuesto: Presupuesto): number {
    if (!item.category) return 0
    const mesStr = String(presupuesto.mes).padStart(2, '0')
    const prefix = `${presupuesto.anio}-${mesStr}`
    return transactions
      .filter(tx =>
        tx.date.startsWith(prefix) &&
        (tx.currency ?? 'COP') === presupuesto.currency &&
        tx.expense != null &&
        tx.category === item.category
      )
      .reduce((s, tx) => s + (tx.expense ?? 0), 0)
  }

  function openNewPresupuesto() {
    setEditing(null)
    setNombre('')
    setTotal('')
    setCurrency(currencies[0] ?? 'COP')
    setShowForm(true)
  }

  function openEditPresupuesto(p: Presupuesto) {
    setEditing(p)
    setNombre(p.nombre)
    setTotal(String(p.total))
    setCurrency(p.currency)
    setShowForm(true)
  }

  function handlePresupuestoSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedTotal = parseFloat(total)
    if (!nombre || isNaN(parsedTotal) || parsedTotal <= 0) return

    if (editing) {
      onUpdate(editing.id, { nombre, total: parsedTotal, currency, mes: editing.mes, anio: editing.anio })
    } else {
      onCreate({ nombre, total: parsedTotal, currency, mes: selectedMes, anio: selectedAnio })
    }
    setShowForm(false)
  }

  function openNewItem(presupuestoId: string) {
    setItemModalFor(presupuestoId)
    setEditingItem(null)
    setItemNombre('')
    setItemMonto('')
    setItemCategory('')
  }

  function openEditItem(item: PresupuestoItem, presupuestoId: string) {
    setItemModalFor(presupuestoId)
    setEditingItem(item)
    setItemNombre(item.nombre)
    setItemMonto(String(item.monto))
    setItemCategory(item.category ?? '')
  }

  function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedMonto = parseFloat(itemMonto)
    if (!itemNombre || isNaN(parsedMonto) || parsedMonto <= 0) return

    const category = itemCategory.trim() || null

    if (editingItem) {
      onUpdateItem(editingItem.id, { nombre: itemNombre, monto: parsedMonto, category })
    } else if (itemModalFor) {
      onCreateItem(itemModalFor, { nombre: itemNombre, monto: parsedMonto, category })
    }
    setItemModalFor(null)
    setEditingItem(null)
  }

  return (
    <div>
      {/* Header row */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-white">Presupuestos</h2>
          <p className="text-xs text-zinc-500">
            {presupuestos.length} presupuesto{presupuestos.length !== 1 ? 's' : ''} registrado{presupuestos.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end">
          {/* Period nav */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevPeriod}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-0 truncate text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {MONTH_NAMES[selectedMes - 1]} {selectedAnio}
            </span>
            <button
              onClick={nextPeriod}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={openNewPresupuesto}
            className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 transition-colors"
          >
            + Nuevo presupuesto
          </button>
        </div>
      </div>

      {/* Empty state for selected period */}
      {filteredPresupuestos.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-600">
          {presupuestos.length === 0
            ? 'No hay presupuestos registrados'
            : `Sin presupuestos en ${MONTH_NAMES[selectedMes - 1]} ${selectedAnio}`}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPresupuestos.map(p => {
            const asignado = p.monto_asignado ?? 0
            const libre = p.monto_libre ?? p.total
            const libreIsNegative = libre < 0
            const items = p.items ?? []
            const hasCategories = items.some(item => !!item.category)

            const mesStr = String(p.mes).padStart(2, '0')
            const prefix = `${p.anio}-${mesStr}`
            const chartData = items
              .filter(item => item.category)
              .map(item => ({
                category: item.category!,
                presupuestado: item.monto,
                gastado: transactions
                  .filter(tx =>
                    tx.date.startsWith(prefix) &&
                    (tx.currency ?? 'COP') === p.currency &&
                    tx.expense != null &&
                    tx.category === item.category
                  )
                  .reduce((s, tx) => s + (tx.expense ?? 0), 0),
              }))

            return (
              <div
                key={p.id}
                className="rounded-xl border border-sky-300/60 bg-sky-50 px-4 py-4 dark:border-sky-900/30 dark:bg-sky-950/20"
              >
                {/* Card header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-bold text-zinc-950 dark:text-white break-words">{p.nombre}</p>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEditPresupuesto(p)}
                      disabled={isPending}
                      className={`rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors dark:hover:bg-zinc-700 dark:hover:text-white ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeletingId(p.id)}
                      disabled={isPending}
                      className={`rounded px-2 py-1 text-xs text-zinc-500 hover:bg-rose-100/80 hover:text-rose-600 transition-colors dark:hover:bg-rose-900/50 dark:hover:text-rose-400 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Summary chips */}
                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  <span className="rounded-full border border-sky-300/60 bg-white px-2.5 py-1 font-medium text-zinc-700 dark:border-sky-800/40 dark:bg-zinc-900 dark:text-zinc-300">
                    Total: <span className="font-mono font-bold">{p.currency} {formatAmount(p.total)}</span>
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                    Asignado: <span className="font-mono font-bold">{formatAmount(asignado)}</span>
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 font-medium ${
                    libreIsNegative
                      ? 'border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-400'
                      : 'border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400'
                  }`}>
                    Libre: <span className="font-mono font-bold">{formatAmount(libre)}</span>
                  </span>
                </div>

                {/* Items sub-list */}
                {items.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {items.map(item => {
                      const gastado = computeGastado(item, p)
                      const isOver = item.category != null && gastado > item.monto

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-sky-200/60 bg-white/60 px-3 py-2 dark:border-sky-900/20 dark:bg-zinc-900/40"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-zinc-800 break-words dark:text-zinc-200">{item.nombre}</p>
                            {item.category && (
                              <p className="text-xs text-zinc-400 dark:text-zinc-500">{item.category}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                {formatAmount(item.monto)}
                              </span>
                              {item.category && (
                                <span className={`font-mono text-xs ${isOver ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  Gstd: {formatAmount(gastado)}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEditItem(item, p.id)}
                                disabled={isPending}
                                className={`rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors dark:hover:bg-zinc-700 dark:hover:text-zinc-300 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => setDeletingItemId(item.id)}
                                disabled={isPending}
                                className={`rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-rose-100/80 hover:text-rose-500 transition-colors dark:hover:bg-rose-900/40 dark:hover:text-rose-400 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add item button */}
                <button
                  onClick={() => openNewItem(p.id)}
                  disabled={isPending}
                  className={`text-xs font-medium text-sky-600 hover:text-sky-500 transition-colors dark:text-sky-400 dark:hover:text-sky-300 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  + Agregar partida
                </button>

                {/* Chart section */}
                {items.length > 0 && (
                  <div className="mt-4 border-t border-sky-200/60 pt-4 dark:border-sky-900/20">
                    {hasCategories ? (
                      <PresupuestoVsRealChart
                        data={chartData}
                        tooltipStyle={tooltipStyle}
                      />
                    ) : (
                      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
                        Asigná categorías a las partidas para ver el gráfico
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Presupuesto form modal (create + edit) */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 bg-black/50 backdrop-blur-sm dark:bg-black/60"
          onClick={() => setShowForm(false)}
        >
          <div
            className="animate-modal w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200/60 bg-white shadow-2xl dark:border-zinc-700/50 dark:bg-zinc-900"
            onClick={e => e.stopPropagation()}
          >
            <div className="max-h-[90svh] overflow-y-auto p-4 sm:p-6 [scrollbar-gutter:stable]">
            <h3 className="mb-5 text-base font-semibold text-zinc-950 dark:text-white">
              {editing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
            </h3>
            <form onSubmit={handlePresupuestoSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  Nombre
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Sueldo enero"
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                    Total
                  </label>
                  <AmountInput
                    value={total}
                    onChange={setTotal}
                    decimals={2}
                    accent="sky"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                    Divisa
                  </label>
                  <Select
                    value={currency}
                    onChange={setCurrency}
                    options={currencies.map(c => ({ value: c, label: currencyLabel(c), icon: currencyFlagUrl(c) }))}
                    accent="sky"
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
                  className={`flex-1 rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {editing ? 'Guardar' : 'Agregar'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Item form modal (create + edit) */}
      {itemModalFor && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 bg-black/50 backdrop-blur-sm dark:bg-black/60"
          onClick={() => { setItemModalFor(null); setEditingItem(null) }}
        >
          <div
            className="animate-modal w-full max-w-sm rounded-2xl border border-zinc-200/60 bg-white p-4 sm:p-6 shadow-2xl max-h-[90svh] overflow-y-auto [scrollbar-gutter:stable] dark:border-zinc-700/50 dark:bg-zinc-900"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="mb-5 text-base font-semibold text-zinc-950 dark:text-white">
              {editingItem ? 'Editar Partida' : 'Nueva Partida'}
            </h3>
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  Nombre
                </label>
                <input
                  type="text"
                  value={itemNombre}
                  onChange={e => setItemNombre(e.target.value)}
                  placeholder="Ej: Arriendo"
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  Monto
                </label>
                <AmountInput
                  value={itemMonto}
                  onChange={setItemMonto}
                  decimals={2}
                  accent="sky"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  Categoría <span className="normal-case font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  list="item-categories"
                  value={itemCategory}
                  onChange={e => setItemCategory(e.target.value)}
                  placeholder="Ej: Alimentación"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                />
                <datalist id="item-categories">
                  {periodCategories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setItemModalFor(null); setEditingItem(null) }}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={`flex-1 rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {editingItem ? 'Guardar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete presupuesto confirmation */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/60"
          onClick={() => setDeletingId(null)}
        >
          <div
            className="animate-modal rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl w-full max-w-xs mx-4 dark:border-zinc-700 dark:bg-zinc-900"
            onClick={e => e.stopPropagation()}
          >
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
              ¿Eliminar este presupuesto? Se eliminarán también todas sus partidas. Esta acción no se puede deshacer.
            </p>
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

      {/* Delete item confirmation */}
      {deletingItemId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/60"
          onClick={() => setDeletingItemId(null)}
        >
          <div
            className="animate-modal rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl w-full max-w-xs mx-4 dark:border-zinc-700 dark:bg-zinc-900"
            onClick={e => e.stopPropagation()}
          >
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
              ¿Eliminar esta partida? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingItemId(null)}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onDeleteItem(deletingItemId); setDeletingItemId(null) }}
                disabled={isPending}
                className={`flex-1 rounded-lg bg-rose-700 py-2 text-sm font-medium text-white hover:bg-rose-600 transition-colors ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
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

export const PresupuestosSection = memo(PresupuestosSectionImpl)
