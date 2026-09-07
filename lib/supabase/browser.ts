import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'

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

export function createBrowserClient() {
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return _createBrowserClient(url, anonKey)
}
