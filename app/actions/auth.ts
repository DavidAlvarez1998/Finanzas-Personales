'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createSession, destroySession } from '@/lib/auth/session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { isExpired } from '@/lib/auth/user-status'

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
  const { data: user, error } = await supabase
    .from('users')
    .insert({ email, password_hash, status: 'pending' })
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
