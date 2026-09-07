'use client'

import { useState, useMemo } from 'react'
import type { Transaction } from '@/types'

interface Props {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function fmt(n: number | null) {
  if (n == null || n === 0) return ''
  return `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}

function parseMonth(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return { month: d.getMonth(), year: d.getFullYear() }
}

export function TransactionTable({ transactions, onEdit, onDelete }: Props) {
  const now = new Date()
  const [filterMonth, setFilterMonth] = useState(now.getMonth())
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const years = useMemo(() => {
    const set = new Set(transactions.map(t => parseMonth(t.date).year))
    set.add(now.getFullYear())
    return Array.from(set).sort((a, b) => b - a)
  }, [transactions])

  const filtered = useMemo(() =>
    transactions
      .filter(t => {
        const { month, year } = parseMonth(t.date)
        return month === filterMonth && year === filterYear
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [transactions, filterMonth, filterYear]
  )

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

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(Number(e.target.value))}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-950 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>{m}</option>
          ))}
        </select>

        <select
          value={filterYear}
          onChange={e => setFilterYear(Number(e.target.value))}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-950 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

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
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-emerald-500">Ingresos</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-rose-500">Egresos</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600">
                  No hay registros para {MONTHS[filterMonth]} {filterYear}
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="bg-transparent hover:bg-zinc-100 transition-colors dark:bg-zinc-900/40 dark:hover:bg-zinc-800/40">
                  <td className="px-4 py-3 text-zinc-600 whitespace-nowrap dark:text-zinc-400">
                    {new Date(t.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-zinc-950 font-medium dark:text-white">{t.description}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">
                    {fmt(t.income)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-rose-400">
                    {fmt(t.expense)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => onEdit(t)}
                        className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => confirmDelete(t.id)}
                        className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-rose-100/80 hover:text-rose-600 transition-colors dark:text-zinc-400 dark:hover:bg-rose-900/50 dark:hover:text-rose-400"
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
                <td colSpan={2} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Total del mes
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                  {fmt(monthIncome)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                  {fmt(monthExpense)}
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
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-600">
            No hay registros para {MONTHS[filterMonth]} {filterYear}
          </p>
        ) : (
          filtered.map(t => (
            <div key={t.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-500">
                    {new Date(t.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <p className="text-sm font-medium text-zinc-950 break-words dark:text-white">{t.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  {t.income ? (
                    <span className="font-mono text-sm font-bold text-emerald-400">{fmt(t.income)}</span>
                  ) : (
                    <span className="font-mono text-sm font-bold text-rose-400">{fmt(t.expense)}</span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                <button
                  onClick={() => onEdit(t)}
                  className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => confirmDelete(t.id)}
                  className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-rose-100/80 hover:text-rose-600 transition-colors dark:text-zinc-400 dark:hover:bg-rose-900/50 dark:hover:text-rose-400"
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
              <span>Total del mes</span>
              <div className="flex gap-4">
                <span className="font-mono text-emerald-400">{fmt(monthIncome)}</span>
                <span className="font-mono text-rose-400">{fmt(monthExpense)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
