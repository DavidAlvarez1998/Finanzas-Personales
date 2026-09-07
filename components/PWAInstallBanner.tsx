'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!promptEvent || dismissed) return null

  const handleInstall = async () => {
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setPromptEvent(null)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200/60 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] dark:border-zinc-800/60 dark:bg-zinc-900/95">
      <div className="mx-auto flex max-w-sm items-center gap-3 px-4 py-3">
        <Image
          src="/android-chrome-192x192.png"
          alt="Finanzas"
          width={40}
          height={40}
          className="rounded-xl shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-950 leading-tight dark:text-white">Finanzas Personales</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Instalá la app</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-sky-900/30 hover:bg-sky-500 transition-colors"
        >
          Instalar
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
          className="shrink-0 rounded-md p-1 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors dark:hover:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
