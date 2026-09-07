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
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
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
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>{m}</option>
          ))}
        </select>

        <select
          value={filterYear}
          onChange={e => setFilterYear(Number(e.target.value))}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-zinc-500">
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Descripción</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-emerald-500">Ingresos</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-rose-500">Egresos</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600">
                  No hay registros para {MONTHS[filterMonth]} {filterYear}
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="bg-zinc-900/40 hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {new Date(t.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{t.description}</td>
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
                        className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => confirmDelete(t.id)}
                        className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-rose-900/50 hover:text-rose-400 transition-colors"
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
              <tr className="border-t border-zinc-700 bg-zinc-900">
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

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl w-80">
            <p className="mb-4 text-sm text-zinc-300">¿Eliminar este registro? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
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
