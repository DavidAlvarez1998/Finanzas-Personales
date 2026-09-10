'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AdminNavLink() {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  return (
    <Link
      href={isAdmin ? '/' : '/admin'}
      className="rounded px-2 py-1 text-xs text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 transition-colors"
    >
      {isAdmin ? 'Dashboard' : 'Admin'}
    </Link>
  )
}
