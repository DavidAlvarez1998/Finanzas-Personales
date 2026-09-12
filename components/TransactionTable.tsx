'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Transaction } from '@/types'
import { Select } from '@/components/ui/Select'
import { formatAmount } from '@/lib/format'

interface Props {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
  isPending: boolean
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const PAGE_SIZE = 10

function fmtSigned(income: number | null, expense: number | null) {
  if (income) return { label: `+${formatAmount(income)}`, positive: true }
  if (expense) return { label: `-${formatAmount(expense)}`, positive: false }
  return { label: '—', positive: null }
}

function parseDate(dateStr: string): Date {
  return dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00')
}

function parseMonth(dateStr: string) {
  const d = parseDate(dateStr)
  return { month: d.getMonth(), year: d.getFullYear() }
}

function fmtDate(dateStr: string) {
  return parseDate(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtTime(dateStr: string): string | null {
  if (!dateStr.includes('T')) return null
  return parseDate(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

async function exportToXLSX(rows: Transaction[], month: string, year: number) {
  const { utils, write } = await import('xlsx')
  const data = rows.map(t => {
    const time = fmtTime(t.date)
    return {
      Fecha: fmtDate(t.date) + (time ? ` ${time}` : ''),
      Descripción: t.description,
      Ingreso: t.income ?? '',
      Egreso: t.expense ?? '',
      Divisa: t.currency ?? 'COP',
    }
  })
  const ws = utils.json_to_sheet(data)
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Registros')
  const buf = write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `registros-${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export function TransactionTable({ transactions, onEdit, onDelete, isPending }: Props) {
  const [filterMonth, setFilterMonth] = useState(0)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const now = new Date()
    setFilterMonth(now.getMonth())
    setFilterYear(now.getFullYear())
  }, [])

  const years = useMemo(() => {
    const set = new Set(transactions.map(t => parseMonth(t.date).year))
    set.add(new Date().getFullYear())
    return Array.from(set).sort((a, b) => b - a)
  }, [transactions])

  const filtered = useMemo(() =>
    transactions
      .filter(t => {
        const { month, year } = parseMonth(t.date)
        const matchesDate = showAll || (month === filterMonth && year === filterYear)
        const matchesSearch = !searchQuery || t.description.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesDate && matchesSearch
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, filterMonth, filterYear, searchQuery, showAll]
  )

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [filterMonth, filterYear, searchQuery, showAll])

  const paginated = showAll ? filtered : filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const monthIncome = filtered.reduce((s, t) => s + (t.income ?? 0), 0)
  const monthExpense = filtered.reduce((s, t) => s + (t.expense ?? 0), 0)

  function confirmDelete(id: string) {
    setDeletingId(id)
  }

  function executeDelete() {
    if (deletingId) {
      onDelete(deletingId)
      setDeletingId(null)
    }
  }

  const showPagination = !showAll && filtered.length > PAGE_SIZE
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {!showAll && (
          <>
            <Select
              value={String(filterMonth)}
              onChange={v => setFilterMonth(Number(v))}
              options={MONTHS.map((m, i) => ({ value: String(i), label: m }))}
              accent="sky"
            />
            <Select
              value={String(filterYear)}
              onChange={v => setFilterYear(Number(v))}
              options={years.map(y => ({ value: String(y), label: String(y) }))}
              accent="sky"
            />
          </>
        )}

        <input
          type="text"
          placeholder="Buscar..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(0) }}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-950 placeholder-zinc-400 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />

        <button
          onClick={() => exportToXLSX(filtered, MONTHS[filterMonth], filterYear)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
        >
          Exportar Excel
        </button>

        <button
          onClick={() => setShowAll(v => !v)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
        >
          {showAll ? 'Ver por mes' : 'Ver todo'}
        </button>

        <span className="ml-auto text-xs text-zinc-500">
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table — desktop only */}
      <div className="hidden sm:block">
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/80">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Descripción</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Categoría</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Monto</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600">
                  {searchQuery
                    ? 'No hay registros que coincidan con la búsqueda'
                    : `No hay registros para ${MONTHS[filterMonth]} ${filterYear}`}
                </td>
              </tr>
            ) : (
              paginated.map(t => (
                <tr key={t.id} className="bg-transparent hover:bg-zinc-100 transition-colors dark:bg-zinc-900/40 dark:hover:bg-zinc-800/40">
                  <td className="px-4 py-3 whitespace-nowrap dark:text-zinc-400">
                    <span className="text-zinc-600 dark:text-zinc-400">{fmtDate(t.date)}</span>
                    {fmtTime(t.date) && (
                      <span className="ml-1.5 text-[10px] text-zinc-400 dark:text-zinc-600">{fmtTime(t.date)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-950 font-medium dark:text-white">{t.description}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-500">{t.category || '—'}</td>
                  <td className={`px-4 py-3 text-right font-mono font-medium ${
                    t.income ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {(() => { const s = fmtSigned(t.income, t.expense); return s.label })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => onEdit(t)}
                        disabled={isPending}
                        className={`rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => confirmDelete(t.id)}
                        disabled={isPending}
                        className={`rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-rose-100/80 hover:text-rose-600 transition-colors dark:text-zinc-400 dark:hover:bg-rose-900/50 dark:hover:text-rose-400 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                <td colSpan={3} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {showAll ? 'Total general' : 'Total del mes'}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold">
                  {monthIncome > 0 && <span className="text-emerald-400">+{formatAmount(monthIncome)}</span>}
                  {monthIncome > 0 && monthExpense > 0 && <span className="text-zinc-500 mx-1.5">·</span>}
                  {monthExpense > 0 && <span className="text-rose-400">-{formatAmount(monthExpense)}</span>}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      </div>

      {/* Mobile card list */}
      <div className="block sm:hidden space-y-3">
        {paginated.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-600">
            {searchQuery
              ? 'No hay registros que coincidan con la búsqueda'
              : `No hay registros para ${MONTHS[filterMonth]} ${filterYear}`}
          </p>
        ) : (
          paginated.map(t => (
            <div key={t.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-500">
                    {fmtDate(t.date)}{fmtTime(t.date) && <span className="ml-1 text-zinc-400">{fmtTime(t.date)}</span>}
                  </p>
                  <p className="text-sm font-medium text-zinc-950 break-words dark:text-white">{t.description}</p>
                  {t.category && <span className="inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">{t.category}</span>}
                </div>
                <div className="shrink-0 text-right">
                  {t.income ? (
                    <span className="font-mono text-sm font-bold text-emerald-400">{formatAmount(t.income)}</span>
                  ) : (
                    <span className="font-mono text-sm font-bold text-rose-400">{formatAmount(t.expense ?? 0)}</span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                <button
                  onClick={() => onEdit(t)}
                  disabled={isPending}
                  className={`rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Editar
                </button>
                <button
                  onClick={() => confirmDelete(t.id)}
                  disabled={isPending}
                  className={`rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-rose-100/80 hover:text-rose-600 transition-colors dark:text-zinc-400 dark:hover:bg-rose-900/50 dark:hover:text-rose-400 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
        {filtered.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <span>{showAll ? 'Total general' : 'Total del mes'}</span>
              <span className="font-mono">
                {monthIncome > 0 && <span className="text-emerald-400">+{formatAmount(monthIncome)}</span>}
                {monthIncome > 0 && monthExpense > 0 && <span className="text-zinc-500 mx-1">·</span>}
                {monthExpense > 0 && <span className="text-rose-400">-{formatAmount(monthExpense)}</span>}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {showPagination && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
          >
            ← Anterior
          </button>
          <span className="text-xs text-zinc-500">
            Página {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/60">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl w-full max-w-xs mx-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">¿Eliminar este registro? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
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
