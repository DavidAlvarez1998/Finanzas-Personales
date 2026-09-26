'use client'

import { useTransition, useEffect, useState } from 'react'
import { startImpersonation } from '../_actions'

interface Props {
  userId: string
  userEmail: string
  isSuperadminTarget: boolean
  userStatus: string
}

export function ImpersonateButton({ userId, userEmail, isSuperadminTarget, userStatus }: Props) {
  const [isPending, startTransitionFn] = useTransition()
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    function handleOnline() { setIsOnline(true) }
    function handleOffline() { setIsOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE === '1'
  const disabled =
    isPending ||
    isSuperadminTarget ||
    userStatus !== 'active' ||
    !isOnline ||
    isOfflineMode

  // Suppress button for the superadmin's own account
  if (isSuperadminTarget) return null

  return (
    <button
      disabled={disabled}
      aria-label={`Ver como ${userEmail}`}
      onClick={() =>
        startTransitionFn(async () => {
          await startImpersonation(userId)
        })
      }
      className="text-xs px-2 py-1 rounded border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {isPending ? '...' : 'Ver como'}
    </button>
  )
}
