'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/db'

const REDIRECT_ATTEMPTS_KEY = 'app-shell-redirect-attempts'

export function AppShellRedirect() {
  const router = useRouter()
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      // Loop guard: track attempts within the same browser session
      const raw = sessionStorage.getItem(REDIRECT_ATTEMPTS_KEY)
      const attempts = raw ? parseInt(raw, 10) : 0
      const next = attempts + 1
      sessionStorage.setItem(REDIRECT_ATTEMPTS_KEY, String(next))

      if (attempts >= 1) {
        // Already attempted a redirect this session — show manual buttons
        if (!cancelled) setShowManual(true)
        return
      }

      try {
        const meta = await db.meta.get('hydrated_user_id')
        if (cancelled) return
        if (meta && meta.value) {
          router.replace('/')
        } else {
          router.replace('/login')
        }
      } catch {
        // IndexedDB unavailable (private mode, corrupted, etc.) — safe fallback
        if (!cancelled) setShowManual(true)
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [router])

  if (showManual) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center gap-4 bg-zinc-950">
        <a
          href="/"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm text-zinc-100 hover:bg-zinc-800"
        >
          Abrir app
        </a>
        <a
          href="/login"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm text-zinc-100 hover:bg-zinc-800"
        >
          Ir a login
        </a>
      </div>
    )
  }

  return null
}
