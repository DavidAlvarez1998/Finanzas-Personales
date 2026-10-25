'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { hydrateFromServer, isSyncStale } from '@/lib/db/seed'
import { clearHydrated } from '@/lib/db/hydration-flag'
import { useSyncTrigger } from '@/lib/hooks/useSyncTrigger'

interface OfflineContextValue {
  userId: string
  syncError: string | null
  clearSyncError: () => void
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
  const [syncError, setSyncError] = useState<string | null>(null)
  const clearSyncError = useCallback(() => setSyncError(null), [])

  // Wire sync triggers (online event + visibilitychange)
  useSyncTrigger()

  // R7: redirect to /login on auth-expired (401 during sync)
  useEffect(() => {
    function handleAuthExpired() {
      clearHydrated()
      router.push('/login')
    }
    window.addEventListener('offline-sync:auth-expired', handleAuthExpired)
    return () => window.removeEventListener('offline-sync:auth-expired', handleAuthExpired)
  }, [router])

  // Mount hydration with 30s stale guard (R3) + error surfacing (R4)
  useEffect(() => {
    if (!userId) return
    async function maybeHydrate() {
      if (typeof navigator === 'undefined' || !navigator.onLine) return
      const stale = await isSyncStale(30_000)
      if (!stale) return
      try {
        await hydrateFromServer(userId)
        setSyncError(null)
      } catch (err) {
        console.error('[OfflineProvider] hydration failed:', err)
        setSyncError(err instanceof Error ? err.message : 'Error de sincronización')
      }
    }
    maybeHydrate()
  }, [userId])

  // Re-pull from server on tab focus if local data is stale (> 2 min).
  // This ensures changes made on other devices show up without a full reload.
  useEffect(() => {
    if (!userId) return
    function handleVisibility() {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      isSyncStale().then(stale => {
        if (stale) {
          hydrateFromServer(userId)
            .then(() => setSyncError(null))
            .catch(err => {
              console.error('[OfflineProvider] re-sync failed:', err)
              setSyncError(err instanceof Error ? err.message : 'Error de sincronización')
            })
        }
      })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [userId])

  return (
    <OfflineContext.Provider value={{ userId, syncError, clearSyncError }}>
      {children}
    </OfflineContext.Provider>
  )
}
