'use client'

import { useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { hydrateFromServer, needsHydration } from '@/lib/db/seed'
import { useSyncTrigger } from '@/lib/hooks/useSyncTrigger'

interface OfflineContextValue {
  userId: string
}

const OfflineContext = createContext<OfflineContextValue | null>(null)

export function useOfflineContext(): OfflineContextValue {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOfflineContext must be used within OfflineProvider')
  return ctx
}

interface OfflineProviderProps {
  userId: string
  children: React.ReactNode
}

export function OfflineProvider({ userId, children }: OfflineProviderProps) {
  const router = useRouter()

  // Wire sync triggers (online event + visibilitychange)
  useSyncTrigger()

  // R7: redirect to /login on auth-expired (401 during sync)
  useEffect(() => {
    function handleAuthExpired() {
      router.push('/login')
    }
    window.addEventListener('offline-sync:auth-expired', handleAuthExpired)
    return () => window.removeEventListener('offline-sync:auth-expired', handleAuthExpired)
  }, [router])

  useEffect(() => {
    if (!userId) return
    // Hydrate on mount if not yet done for this user and we're online
    needsHydration(userId).then(needs => {
      if (needs && typeof navigator !== 'undefined' && navigator.onLine) {
        hydrateFromServer(userId).catch(err => {
          console.error('[OfflineProvider] hydration failed:', err)
        })
      }
    })
  }, [userId])

  return (
    <OfflineContext.Provider value={{ userId }}>
      {children}
    </OfflineContext.Provider>
  )
}
