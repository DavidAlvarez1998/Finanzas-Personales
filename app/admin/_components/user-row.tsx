'use client'

import { useTransition } from 'react'
import type { AdminUserRow } from '@/types'
import { activateUser, deactivateUser, setExpiry, clearExpiry } from '../_actions'

interface Props {
  user: AdminUserRow
  isSuperadmin?: boolean
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400 border border-green-500/30',
  pending: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  inactive: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  inactive: 'Inactivo',
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Sin vencimiento'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function UserRow({ user, isSuperadmin = false }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleActivate() {
    startTransition(async () => {
      await activateUser(user.id)
    })
  }

  function handleDeactivate() {
    startTransition(async () => {
      await deactivateUser(user.id)
    })
  }

  function handleClearExpiry() {
    startTransition(async () => {
      await clearExpiry(user.id)
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="truncate text-sm font-medium text-zinc-100">{user.email}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[user.status] ?? STATUS_BADGE.inactive}`}>
            {STATUS_LABEL[user.status] ?? user.status}
          </span>
          <span className="text-xs text-zinc-500">
            Vence: {formatDate(user.expires_at)}
          </span>
          <span className="text-xs text-zinc-600">
            Registrado: {formatDate(user.created_at)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        <div className="flex gap-2 flex-wrap">
          {!isSuperadmin && (user.status === 'pending' || user.status === 'inactive') && (
            <button
              onClick={handleActivate}
              disabled={isPending}
              className="rounded px-3 py-1 text-xs font-medium bg-green-700 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
            >
              Activar
            </button>
          )}
          {!isSuperadmin && user.status === 'active' && (
            <button
              onClick={handleDeactivate}
              disabled={isPending}
              className="rounded px-3 py-1 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors disabled:opacity-50"
            >
              Desactivar
            </button>
          )}
          {user.expires_at && (
            <button
              onClick={handleClearExpiry}
              disabled={isPending}
              className="rounded px-3 py-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors disabled:opacity-50"
            >
              Quitar vencimiento
            </button>
          )}
        </div>

        <form
          action={async (formData: FormData) => {
            startTransition(async () => {
              await setExpiry(user.id, formData)
            })
          }}
          className="flex items-center gap-2"
        >
          <input
            type="date"
            name="date"
            required
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded px-3 py-1 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors disabled:opacity-50"
          >
            Fijar vencimiento
          </button>
        </form>
      </div>
    </div>
  )
}
