'use client'

import { clearHydrated } from '@/lib/db/hydration-flag'
import { logout } from '@/app/actions/auth'

export function LogoutForm() {
  return (
    <form
      action={logout}
      onSubmit={() => clearHydrated()}
    >
      <button
        type="submit"
        className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        Cerrar sesión
      </button>
    </form>
  )
}
