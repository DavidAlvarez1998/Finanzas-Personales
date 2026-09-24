'use client'

import { useState, useEffect } from 'react'
import type { PendingOp } from '@/lib/db/schema'

interface DeadLetterDrawerProps {
  failedOps: PendingOp[]
  onRetry: (id: string) => void
  onDismiss: (id: string) => void
}

const OP_LABELS: Record<string, string> = {
  'transaction.create': 'Crear registro',
  'transaction.update': 'Editar registro',
  'transaction.delete': 'Eliminar registro',
  'debt.create': 'Crear deuda',
  'debt.update': 'Editar deuda',
  'debt.delete': 'Eliminar deuda',
  'debt_payment.create': 'Registrar pago de deuda',
  'debt_payment.delete': 'Eliminar pago de deuda',
  'presupuesto.create': 'Crear presupuesto',
  'presupuesto.update': 'Editar presupuesto',
  'presupuesto.delete': 'Eliminar presupuesto',
  'presupuesto_item.create': 'Agregar ítem de presupuesto',
  'presupuesto_item.update': 'Editar ítem de presupuesto',
  'presupuesto_item.delete': 'Eliminar ítem de presupuesto',
  'savings_goal.create': 'Crear meta',
  'savings_goal.update': 'Editar meta',
  'savings_goal.delete': 'Eliminar meta',
  'savings_goal.status': 'Actualizar estado de meta',
  'savings_contribution.create': 'Agregar aporte',
  'savings_contribution.delete': 'Eliminar aporte',
  'user.currencies': 'Actualizar monedas',
  'user.display_currency': 'Cambiar moneda principal',
}

function humanize(type: string): string {
  return OP_LABELS[type] ?? type
}

export function DeadLetterDrawer({ failedOps, onRetry, onDismiss }: DeadLetterDrawerProps) {
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(null), 3000)
    return () => clearTimeout(t)
  }, [confirming])

  if (failedOps.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-80 overflow-y-auto">
      <div className="animate-modal mx-auto max-w-5xl px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-3">
          Operaciones fallidas ({failedOps.length})
        </p>
        <ul className="space-y-2">
          {failedOps.map(op => (
            <li
              key={op.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-800/40 dark:bg-rose-950/30"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {humanize(op.type)}
                </p>
                {op.error && (
                  <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-400 truncate">
                    {op.error}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => onRetry(op.id)}
                  className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Reintentar
                </button>
                {confirming === op.id ? (
                  <button
                    onClick={() => { onDismiss(op.id); setConfirming(null) }}
                    className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-900/60"
                  >
                    ¿Confirmar? (3s)
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirming(op.id)}
                    className="rounded-md bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-900/60"
                  >
                    Descartar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
