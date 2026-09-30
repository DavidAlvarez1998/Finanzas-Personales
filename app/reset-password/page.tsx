import Link from 'next/link'
import type { Metadata } from 'next'
import { ResetPasswordForm } from './_components/reset-password-form'

export const metadata: Metadata = {
  title: 'Restablecer contraseña',
  other: {
    referrer: 'no-referrer',
  },
}

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Enlace inválido
          </h1>
          <p className="text-sm text-zinc-500">
            Este enlace no es válido o ya expiró.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block text-sm text-sky-500 underline underline-offset-2 hover:text-sky-400 transition-colors"
          >
            Solicitar un nuevo enlace
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Nueva contraseña
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ingresá tu nueva contraseña. Mínimo 8 caracteres.
          </p>
        </div>

        <ResetPasswordForm token={token} />
      </div>
    </div>
  )
}
