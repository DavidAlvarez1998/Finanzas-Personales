'use client'

import { useState, useActionState } from 'react'
import { login, register } from '@/app/actions/auth'

type Mode = 'login' | 'register'
type ActionState = { error: string } | null

function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return login(formData) as Promise<ActionState>
}

function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return register(formData) as Promise<ActionState>
}

export function LoginForm() {
  const [mode, setMode] = useState<Mode>('login')

  const [loginState, loginDispatch, loginPending] = useActionState<
    ActionState,
    FormData
  >(loginAction, null)

  const [registerState, registerDispatch, registerPending] = useActionState<
    ActionState,
    FormData
  >(registerAction, null)

  const isLogin = mode === 'login'
  const state = isLogin ? loginState : registerState
  const isPending = isLogin ? loginPending : registerPending
  const action = isLogin ? loginDispatch : registerDispatch

  return (
    <div className="w-full max-w-sm">
      {/* Mode toggle */}
      <div className="mb-6 flex rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            isLogin
              ? 'bg-zinc-700 text-white shadow'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            !isLogin
              ? 'bg-zinc-700 text-white shadow'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Registrarse
        </button>
      </div>

      <form action={action} className="space-y-4">
        {/* Error message */}
        {state?.error && (
          <div className="rounded-lg border border-red-800/60 bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-xs font-medium text-zinc-400"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="vos@ejemplo.com"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-medium text-zinc-400"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors"
            />
          </div>

          {!isLogin && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-xs font-medium text-zinc-400"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors"
              />
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
