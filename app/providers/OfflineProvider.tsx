'use client'

import { useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { hydrateFromServer, needsHydration, isSyncStale } from '@/lib/db/seed'
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
    async function maybeHydrate() {
      if (typeof navigator === 'undefined' || !navigator.onLine) return
      const needs = await needsHydration(userId)
      const stale = await isSyncStale()
      if (needs || stale) {
        hydrateFromServer(userId).catch(err => {
          console.error('[OfflineProvider] hydration failed:', err)
        })
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
          hydrateFromServer(userId).catch(err => {
            console.error('[OfflineProvider] re-sync failed:', err)
          })
        }
      })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [userId])

  return (
    <OfflineContext.Provider value={{ userId }}>
      {children}
    </OfflineContext.Provider>
  )
}
