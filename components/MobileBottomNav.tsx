'use client'

import { useRef, useEffect, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import {
  TABS,
  PRIMARY_TAB_KEYS,
  MAS_TAB_KEYS,
  type TabKey,
  type BadgeCounts,
} from '@/components/DashboardShell'

interface MobileBottomNavProps {
  tab: TabKey
  onTabChange: (tab: TabKey) => void
  badges: BadgeCounts
}

const BADGE_COLORS: Partial<Record<TabKey, string>> = {
  debts:        'bg-amber-500 text-white',
  presupuestos: 'bg-sky-500 text-white',
  savings:      'bg-violet-500 text-white',
  ahorros:      'bg-sky-500 text-white',
  inversiones:  'bg-emerald-500 text-white',
}

export function MobileBottomNav({ tab, onTabChange, badges }: MobileBottomNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const [masOpen, setMasOpen] = useState(false)

  // Publish --bottom-nav-h CSS var so other components can read nav height
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const publish = () =>
      document.documentElement.style.setProperty('--bottom-nav-h', el.offsetHeight + 'px')
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.setProperty('--bottom-nav-h', '0px')
    }
  }, [])

  const primaryTabs = TABS.filter(t => PRIMARY_TAB_KEYS.includes(t.key))
  const masTabs = TABS.filter(t => MAS_TAB_KEYS.includes(t.key))

  const isMasActive = MAS_TAB_KEYS.includes(tab)

  return (
    <div className="flex md:hidden fixed bottom-0 inset-x-0 z-30 flex-col">
      {/* Más backdrop */}
      {masOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/40"
          onClick={() => setMasOpen(false)}
        />
      )}

      {/* Más sheet panel */}
      {masOpen && (
        <div className="relative z-20 bg-white dark:bg-zinc-900 rounded-t-2xl px-4 pt-4 pb-[env(safe-area-inset-bottom,0px)] max-h-[50dvh] overflow-y-auto animate-sheet-up">
          <div className="flex flex-col gap-1">
            {masTabs.map(t => {
              const Icon = t.icon
              const badgeCount = t.getBadge(badges)
              const isActive = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => { onTabChange(t.key); setMasOpen(false) }}
                  className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{t.label}</span>
                  {badgeCount > 0 && (
                    <span className={`ml-auto rounded-full px-1.5 py-0.5 text-xs font-bold ${BADGE_COLORS[t.key] ?? 'bg-zinc-500 text-white'}`}>
                      {badgeCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        ref={navRef}
        className="relative z-30 flex items-stretch bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Primary tab buttons */}
        {primaryTabs.map(t => {
          const Icon = t.icon
          const badgeCount = t.getBadge(badges)
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {badgeCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold flex items-center justify-center px-0.5 ${BADGE_COLORS[t.key] ?? 'bg-zinc-500 text-white'}`}
                  >
                    {badgeCount}
                  </span>
                )}
              </span>
              <span>{t.label}</span>
            </button>
          )
        })}

        {/* Más button */}
        <button
          onClick={() => setMasOpen(v => !v)}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 text-xs font-medium transition-colors ${
            isMasActive || masOpen
              ? 'text-sky-600 dark:text-sky-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>Más</span>
        </button>
      </nav>
    </div>
  )
}
