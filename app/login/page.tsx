import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/LoginForm'

export default async function LoginPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Control de Finanzas
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gestión personal de ingresos y egresos
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
