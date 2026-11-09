'use client'

import { useRef, useEffect } from 'react'
import { registerBanner } from '@/lib/ui/banner-offset'

interface ExpiryBannerProps {
  daysLeft: number
  whatsappNumber?: string
}

export function ExpiryBanner({ daysLeft, whatsappNumber }: ExpiryBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null)
  const visible = daysLeft > 0 && daysLeft <= 5

  useEffect(() => {
    const el = bannerRef.current
    if (!el || !visible) {
      registerBanner('expiry', 0)
      return
    }
    const ro = new ResizeObserver(() => registerBanner('expiry', el.offsetHeight))
    ro.observe(el)
    registerBanner('expiry', el.offsetHeight)
    return () => {
      ro.disconnect()
      registerBanner('expiry', 0)
    }
  }, [visible])

  if (!visible) return null

  const msg = encodeURIComponent('Hola, quiero renovar mi suscripción en la app de finanzas')
  return (
    <div
      ref={bannerRef}
      className="rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 flex items-center justify-between text-sm"
    >
      <span>
        Tu suscripción vence en {daysLeft} día{daysLeft !== 1 ? 's' : ''}.
      </span>
      {whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber}?text=${msg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium ml-4"
        >
          Contactar por WhatsApp
        </a>
      )}
    </div>
  )
}
