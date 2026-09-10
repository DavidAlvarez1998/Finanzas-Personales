import { requireAdmin } from '@/lib/auth/guards'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return <div className="min-h-screen bg-background">{children}</div>
}
