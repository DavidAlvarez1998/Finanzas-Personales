'use client'

import { useTransition, useState } from 'react'
import type { AdminUserRow } from '@/types'
import { activateUser, deactivateUser, setExpiry, clearExpiry, forceResetPassword, generateResetLink } from '../_actions'
import { ImpersonateButton } from './impersonate-button'

interface Props {
  user: AdminUserRow
  superadminEmail?: string
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
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function ExpiryTag({ expires_at }: { expires_at: string | null }) {
  if (!expires_at) {
    return <span className="text-xs text-zinc-600 italic">Sin vencimiento</span>
  }

  const days = daysLeft(expires_at)
  const date = formatDate(expires_at)

  if (days !== null && days < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-xs text-red-400">
        Venció el {date}
      </span>
    )
  }

  if (days !== null && days <= 5) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs text-amber-400">
        ⚠ Vence en {days} día{days !== 1 ? 's' : ''} — {date}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
      Vence {date}
    </span>
  )
}

export function UserRow({ user, superadminEmail }: Props) {
  const [isPending, startTransition] = useTransition()
  const [resetPassword, setResetPassword] = useState('')
  const [resetFeedback, setResetFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const isSuperadmin = !!superadminEmail && user.email === superadminEmail

  function handleActivate() {
    startTransition(async () => { await activateUser(user.id) })
  }

  function handleDeactivate() {
    startTransition(async () => { await deactivateUser(user.id) })
  }

  function handleClearExpiry() {
    startTransition(async () => { await clearExpiry(user.id) })
  }

  async function handleGenerateLink() {
    setIsGenerating(true)
    setGeneratedLink(null)
    setLinkCopied(false)
    const result = await generateResetLink(user.id)
    setIsGenerating(false)
    if ('error' in result) {
      setResetFeedback({ ok: false, msg: result.error })
    } else {
      setGeneratedLink(result.url)
    }
  }

  async function handleCopyLink() {
    if (!generatedLink) return
    await navigator.clipboard.writeText(generatedLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function handleForceReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setResetFeedback(null)
    setIsResetting(true)

    const result = await forceResetPassword(user.id, resetPassword)

    setIsResetting(false)
    if (result && 'error' in result) {
      setResetFeedback({ ok: false, msg: result.error })
    } else {
      setResetFeedback({ ok: true, msg: 'Contraseña actualizada.' })
      setResetPassword('')
    }
  }

  return (
    <div className={`rounded-lg border bg-zinc-900 p-4 transition-opacity ${isPending ? 'opacity-50' : ''} ${user.status === 'inactive' ? 'border-zinc-800/50' : 'border-zinc-800'}`}>
      {/* Top row: email + status */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">{user.email}</p>
          <p className="text-xs text-zinc-600 mt-0.5">
            Registrado el {formatDate(user.created_at)}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[user.status] ?? STATUS_BADGE.inactive}`}>
          {STATUS_LABEL[user.status] ?? user.status}
        </span>
      </div>

      {/* Expiry info */}
      <div className="flex items-center gap-2 mb-4">
        <ExpiryTag expires_at={user.expires_at} />
        {user.expires_at && (
          <button
            onClick={handleClearExpiry}
            disabled={isPending}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-50 underline underline-offset-2"
          >
            Quitar
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {(user.status === 'pending' || user.status === 'inactive') && (
          <button
            onClick={handleActivate}
            disabled={isPending}
            className="rounded px-3 py-1.5 text-xs font-medium bg-green-700 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
          >
            Activar
          </button>
        )}
        {user.status === 'active' && (
          <button
            onClick={handleDeactivate}
            disabled={isPending}
            className="rounded px-3 py-1.5 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors disabled:opacity-50"
          >
            Desactivar
          </button>
        )}
        <ImpersonateButton
          userId={user.id}
          userEmail={user.email}
          isSuperadminTarget={!!superadminEmail && user.email === superadminEmail}
          userStatus={user.status}
        />

        <form
          action={async (formData: FormData) => {
            startTransition(async () => { await setExpiry(user.id, formData) })
          }}
          className="flex items-center gap-2 ml-auto"
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
            className="rounded px-3 py-1.5 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {user.expires_at ? 'Cambiar fecha' : 'Fijar vencimiento'}
          </button>
        </form>
      </div>

      {/* Generate reset link — share manually with the user */}
      {!isSuperadmin && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500 shrink-0">Recuperación:</span>
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={isGenerating}
              className="rounded px-3 py-1.5 text-xs font-medium bg-sky-800 hover:bg-sky-700 text-white transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isGenerating ? 'Generando...' : 'Generar link'}
            </button>
          </div>
          {generatedLink && (
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={generatedLink}
                className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 flex-1 min-w-0 font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded px-3 py-1.5 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors whitespace-nowrap"
              >
                {linkCopied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Force-reset — superadmin only, not shown for the superadmin account itself */}
      {!isSuperadmin && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <form onSubmit={handleForceReset} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500 shrink-0">Nueva contraseña:</span>
            <input
              type="password"
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              placeholder="mínimo 8 caracteres"
              minLength={8}
              required
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none flex-1 min-w-0"
            />
            <button
              type="submit"
              disabled={isResetting}
              className="rounded px-3 py-1.5 text-xs font-medium bg-amber-700 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isResetting ? 'Guardando...' : 'Resetear'}
            </button>
          </form>
          {resetFeedback && (
            <p className={`mt-1.5 text-xs ${resetFeedback.ok ? 'text-green-400' : 'text-red-400'}`}>
              {resetFeedback.msg}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
