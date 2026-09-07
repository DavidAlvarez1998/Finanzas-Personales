'use client'

import { useEffect } from 'react'

interface Props {
  error: Error & { digest?: string }
  retry: () => void
}

export default function ErrorPage({ error, retry }: Props) {
  useEffect(() => {
    console.error('[Dashboard error]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white gap-6 px-4">
      <div className="rounded-2xl border border-rose-800/40 bg-rose-950/20 p-8 max-w-md w-full text-center">
        <h2 className="text-lg font-bold text-rose-400 mb-2">
          Algo salió mal
        </h2>
        <p className="text-sm text-zinc-400 mb-6">
          {error.message || 'Ocurrió un error inesperado. Podés intentar de nuevo.'}
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-600 font-mono mb-6">
            Referencia: {error.digest}
          </p>
        )}
        <button
          onClick={retry}
          className="rounded-lg bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
