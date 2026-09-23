'use client'

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/index'
import { drainQueue } from '@/lib/db/sync'
import { DeadLetterDrawer } from '@/components/DeadLetterDrawer'
import type { PendingOp } from '@/lib/db/schema'

export function SyncStatusBadge() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const queuedCount = useLiveQuery<number, 0>(
    () => db.pending_ops.where('status').equals('queued').count(),
    [],
    0
  )

  const failedOps = useLiveQuery<PendingOp[], PendingOp[]>(
    () => db.pending_ops.where('status').equals('failed').toArray(),
    [],
    []
  )

  const failedCount = failedOps.length

  async function handleRetry(id: string) {
    await db.pending_ops.update(id, {
      status: 'queued',
      error: null,
      updated_at: Date.now(),
    })
    await drainQueue()
  }

  async function handleDismiss(id: string) {
    await db.pending_ops.delete(id)
  }

  if (!queuedCount && !failedCount) return null

  return (
    <>
      <div className="flex items-center gap-1.5">
        {queuedCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
            <span className="inline-block h-2 w-2 animate-spin rounded-full border border-zinc-500 border-t-transparent dark:border-zinc-400" />
            {queuedCount}
          </span>
        )}
        {failedCount > 0 && (
          <button
            onClick={() => setDrawerOpen(v => !v)}
            className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-900/60"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
            {failedCount}
          </button>
        )}
      </div>

      {drawerOpen && failedCount > 0 && (
        <DeadLetterDrawer
          failedOps={failedOps}
          onRetry={handleRetry}
          onDismiss={handleDismiss}
        />
      )}
    </>
  )
}
