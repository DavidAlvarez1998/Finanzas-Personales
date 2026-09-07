import { redirect } from 'next/navigation'
import { createServerClient } from './server'

/**
 * Defense-in-depth session guard for Server Components.
 * Redirects to /login if no valid Supabase session exists.
 * Call this at the top of any protected Server Component page.
 */
export async function verifySession(): Promise<void> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }
}
