'use client'

import { useEffect } from 'react'
import { drainQueue } from '@/lib/db/sync'

export function useSyncTrigger(): void {
  useEffect(() => {
    const handleOnline = () => {
      drainQueue().catch(() => {
        // Silent — errors are captured inside drainQueue and stored in Dexie
      })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        drainQueue().catch(() => {})
      }
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
