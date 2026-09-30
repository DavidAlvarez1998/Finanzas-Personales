import Link from 'next/link'
import { ForgotPasswordForm } from './_components/forgot-password-form'

export const metadata = {
  title: 'Recuperar contraseña',
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Recuperar contraseña
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
          </p>
        </div>

        <ForgotPasswordForm />

        <p className="text-center text-xs text-zinc-500">
          <Link href="/login" className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
