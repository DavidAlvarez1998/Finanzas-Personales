'use client'

import { useEffect } from 'react'
import { drainQueue } from '@/lib/db/sync'
import { db } from '@/lib/db'

async function resetFailedAndDrain(): Promise<void> {
  const failedOps = await db.pending_ops.where('status').equals('failed').toArray()
  if (failedOps.length > 0) {
    const now = Date.now()
    await Promise.all(
      failedOps.map(op =>
        db.pending_ops.update(op.id, { status: 'queued', attempts: 0, error: null, updated_at: now })
      )
    )
  }
  await drainQueue()
}

export function useSyncTrigger(): void {
  useEffect(() => {
    const handleOnline = () => {
      resetFailedAndDrain().catch(() => {})
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetFailedAndDrain().catch(() => {})
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
