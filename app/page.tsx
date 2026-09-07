// Server Component — defense-in-depth session guard
// Full refactor to fetch data server-side is Slice 2 (T14).
import { verifySession } from '@/lib/supabase/verify-session'
import { ClientPage } from '@/components/ClientPage'

export default async function Home() {
  // Defense-in-depth: redirect to /login if no valid session,
  // even if proxy.ts misfires or a request bypasses it.
  await verifySession()

  return <ClientPage />
}
