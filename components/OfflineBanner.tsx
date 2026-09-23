'use client'

import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import { db } from '@/lib/db/index'

function formatLastSync(ts: number): string {
  const diffMs = Date.now() - ts
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'hace menos de 1 min'
  if (diffMin === 1) return 'hace 1 min'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours === 1) return 'hace 1 hora'
  if (diffHours < 24) return `hace ${diffHours} horas`
  const diffDays = Math.floor(diffHours / 24)
  return `hace ${diffDays} día${diffDays === 1 ? '' : 's'}`
}

export function OfflineBanner() {
  const { online } = useNetworkStatus()
  const [showOnline, setShowOnline] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  const lastSyncMeta = useLiveQuery(
    () => db.meta.get('last_sync_at'),
    []
  )
  const lastSyncAt = lastSyncMeta?.value as number | null | undefined

  // Track transitions: offline → online triggers the "Conectado" brief banner
  useEffect(() => {
    if (!online) {
      setWasOffline(true)
      setShowOnline(false)
    } else if (wasOffline) {
      setShowOnline(true)
      setWasOffline(false)
      const timer = setTimeout(() => setShowOnline(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [online, wasOffline])

  if (online && !showOnline) return null

  if (online && showOnline) {
    return (
      <div className="w-full bg-emerald-600 text-white text-xs font-medium px-4 py-1.5 text-center">
        Conectado
      </div>
    )
  }

  // Offline
  const syncLabel = lastSyncAt
    ? `última sincronización: ${formatLastSync(lastSyncAt)}`
    : 'nunca sincronizado'

  return (
    <div className="w-full bg-amber-600 text-white text-xs font-medium px-4 py-1.5 text-center">
      Sin conexión — {syncLabel}
    </div>
  )
}
