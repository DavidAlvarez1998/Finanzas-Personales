import { createServerClient as _createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[Supabase] Missing environment variable: ${name}. ` +
        `Copy .env.local.example to .env.local and fill in your Supabase credentials.`
    )
  }
  return value
}

export async function createServerClient() {
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const cookieStore = await cookies()

  return _createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // In Server Components, cookies cannot be set.
          // The proxy.ts handles rolling refresh for the response.
        }
      },
    },
  })
}
