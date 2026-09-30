'use client'

import { useState } from 'react'
import { requestPasswordReset } from '@/app/actions/auth'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const result = await requestPasswordReset(formData)

    setIsPending(false)

    if ('error' in result) {
      setError(result.error)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-4 text-sm text-green-400">
        Si el email está registrado, recibirás un enlace en breve.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vos@ejemplo.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
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
            Enviando...
          </span>
        ) : (
          'Enviar enlace'
        )}
      </button>
    </form>
  )
}
