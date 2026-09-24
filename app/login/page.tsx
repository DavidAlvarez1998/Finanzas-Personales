import Image from 'next/image'
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
          <div className="flex flex-col items-center text-center">
            <Image
              src="/android-chrome-192x192.png"
              alt="Finanzas Personales"
              width={56}
              height={56}
              className="rounded-xl"
              priority
            />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
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
