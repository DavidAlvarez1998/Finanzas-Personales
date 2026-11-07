'use client'

import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import { db } from '@/lib/db/index'
import { useOfflineContext } from '@/app/providers/OfflineProvider'

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
  const { syncError, clearSyncError } = useOfflineContext()
  const [showSyncError, setShowSyncError] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  const lastSyncMeta = useLiveQuery(
    () => db.meta.get('last_sync_at'),
    []
  )
  const lastSyncAt = lastSyncMeta?.value as number | null | undefined

  // Reveal sync-error strip when the error appears, auto-dismiss after 5s.
  useEffect(() => {
    if (!syncError) {
      setShowSyncError(false)
      return
    }
    setShowSyncError(true)
    const t = setTimeout(() => {
      setShowSyncError(false)
      clearSyncError()
    }, 5000)
    return () => clearTimeout(t)
  }, [syncError, clearSyncError])

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

  // Determine visibility and content
  const visible = !online || (online && showSyncError) || (online && showOnline)

  // Publish banner height as CSS variable on the root element
  useEffect(() => {
    const el = bannerRef.current
    if (!el) return
    if (visible) {
      document.documentElement.style.setProperty('--banner-h', el.offsetHeight + 'px')
    } else {
      document.documentElement.style.setProperty('--banner-h', '0px')
    }
  }, [visible])

  function getBannerContent() {
    if (!online) {
      const syncLabel = lastSyncAt
        ? `última sincronización: ${formatLastSync(lastSyncAt)}`
        : 'nunca sincronizado'
      return {
        text: `Sin conexión — ${syncLabel}`,
        colorClass: 'bg-amber-600',
      }
    }
    if (showSyncError) {
      return {
        text: 'No se pudo actualizar los datos',
        colorClass: 'bg-amber-500',
      }
    }
    if (showOnline) {
      return {
        text: 'Conectado',
        colorClass: 'bg-emerald-600',
      }
    }
    return { text: '', colorClass: 'bg-amber-600' }
  }

  const { text, colorClass } = getBannerContent()

  return (
    <div
      ref={bannerRef}
      className={`fixed top-0 inset-x-0 z-20 ${colorClass} text-white text-xs font-medium px-4 py-1.5 text-center transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {text}
    </div>
  )
}
