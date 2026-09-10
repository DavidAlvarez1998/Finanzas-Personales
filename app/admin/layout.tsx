import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-zinc-800 px-6 py-3">
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Volver al dashboard
        </Link>
      </div>
      {children}
    </div>
  )
}
