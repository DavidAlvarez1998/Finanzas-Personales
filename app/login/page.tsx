import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { LoginForm } from '@/components/LoginForm'
import { PWAInstallBanner } from '@/components/PWAInstallBanner'

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect('/')

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Control de Finanzas
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Gestión personal de ingresos y egresos
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
      <PWAInstallBanner />
    </>
  )
}
