import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/\s/g, '')
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local.')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local.')
  return createClient(url, key, { auth: { persistSession: false } })
}
