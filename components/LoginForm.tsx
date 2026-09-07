'use client'

import { useState } from 'react'
import { login, register } from '@/app/actions/auth'

type Mode = 'login' | 'register'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
      <line x1="2" x2="22" y1="2" y2="22"/>
    </svg>
  )
}

export function LoginForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const isLogin = mode === 'login'

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const result = await (isLogin ? login(formData) : register(formData))

    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
    // on success the server action calls redirect() — no code runs after
  }

  return (
    <div className="w-full max-w-sm">
      {/* Mode toggle */}
      <div className="mb-6 flex rounded-xl border border-zinc-200 bg-zinc-100/50 p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
        <button
          type="button"
          onClick={() => switchMode('login')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            isLogin
              ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => switchMode('register')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            !isLogin
              ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          Registrarse
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-3">
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

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm text-zinc-950 placeholder-zinc-400 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-700 transition-colors dark:hover:text-zinc-300"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm text-zinc-950 placeholder-zinc-400 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-700 transition-colors dark:hover:text-zinc-300"
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-sky-900/30"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {isLogin ? 'Ingresando...' : 'Registrando...'}
            </span>
          ) : isLogin ? (
            'Ingresar'
          ) : (
            'Crear cuenta'
          )}
        </button>
      </form>
    </div>
  )
}
