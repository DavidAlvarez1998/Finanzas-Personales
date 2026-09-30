'use client'

import { useState } from 'react'
import { resetPassword } from '@/app/actions/auth'

interface Props {
  token: string
}

export function ResetPasswordForm({ token }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const result = await resetPassword(formData)

    // If resetPassword returns, it means there was an error (success calls redirect()).
    if (result && 'error' in result) {
      setError(result.error)
    }
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Hidden token field — read by the server action */}
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="password" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-600"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder-zinc-400 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-600"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-sky-900/30"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Guardando...
          </span>
        ) : (
          'Establecer nueva contraseña'
        )}
      </button>
    </form>
  )
}
