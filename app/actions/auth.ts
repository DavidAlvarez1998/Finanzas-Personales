'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { createSession, destroySession } from '@/lib/auth/session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { isExpired } from '@/lib/auth/user-status'
import { WORLD_CURRENCIES } from '@/lib/constants/currencies'

const VALID_CURRENCY_CODES = new Set(WORLD_CURRENCIES.map(c => c.code))

async function detectCurrencyFromIp(ip: string): Promise<string> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return 'USD'
  }
  try {
    const res = await fetch(`https://ipapi.co/${ip}/currency/`, {
      headers: { 'User-Agent': 'finanzas-app/1.0' },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return 'USD'
    const code = (await res.text()).trim().toUpperCase()
    return VALID_CURRENCY_CODES.has(code) ? code : 'USD'
  } catch {
    return 'USD'
  }
}

export async function login(
  formData: FormData
): Promise<{ error: string } | void> {
  const email = (formData.get('email') as string | null)?.toLowerCase().trim()
  const password = formData.get('password') as string | null

  if (!email || !password) return { error: 'Email y contraseña son requeridos.' }

  const supabase = createServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, email, password_hash, status, expires_at')
    .eq('email', email)
    .single()

  if (!user) return { error: 'Credenciales inválidas.' }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return { error: 'Credenciales inválidas.' }

  const isSuperadmin = user.email === process.env.SUPERADMIN_EMAIL

  if (!isSuperadmin) {
    if (user.status !== 'active') {
      return { error: 'Tu cuenta está pendiente de activación o fue desactivada. Contactá al administrador.' }
    }
    if (isExpired(user.expires_at)) {
      return { error: 'Tu suscripción venció. Contactá al administrador para renovarla.' }
    }
  }

  await createSession({ userId: user.id, email: user.email })
  redirect('/')
}

export async function register(
  formData: FormData
): Promise<{ error: string } | void> {
  const email = (formData.get('email') as string | null)?.toLowerCase().trim()
  const password = formData.get('password') as string | null
  const confirmPassword = formData.get('confirmPassword') as string | null

  if (!email || !password) return { error: 'Email y contraseña son requeridos.' }
  if (password !== confirmPassword) return { error: 'Las contraseñas no coinciden.' }
  if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' }

  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) return { error: 'El email ya está registrado.' }

  const password_hash = await hashPassword(password)

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim()
    || headersList.get('x-real-ip')
    || ''
  const defaultCurrency = await detectCurrencyFromIp(ip)

  const { data: user, error } = await supabase
    .from('users')
    .insert({ email, password_hash, status: 'pending', currencies: [defaultCurrency] })
    .select('id, email')
    .single()

  if (error || !user) {
    return { error: error?.message ?? 'Error al crear la cuenta.' }
  }

  redirect('/pending')
}

export async function logout(): Promise<void> {
  await destroySession()
  redirect('/login')
}
