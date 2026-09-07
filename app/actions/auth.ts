'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createSession, destroySession } from '@/lib/auth/session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

export async function login(
  formData: FormData
): Promise<{ error: string } | void> {
  const email = (formData.get('email') as string | null)?.toLowerCase().trim()
  const password = formData.get('password') as string | null

  if (!email || !password) return { error: 'Email y contraseña son requeridos.' }

  const supabase = createServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, email, password_hash')
    .eq('email', email)
    .single()

  if (!user) return { error: 'Credenciales inválidas.' }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return { error: 'Credenciales inválidas.' }

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
    .insert({ email, password_hash })
    .select('id, email')
    .single()

  if (error || !user) {
    const testRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?select=id&limit=1`,
      { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
    )
    return { error: `insert error: ${error?.message} | direct fetch: ${testRes.status} ${await testRes.text()}` }
  }

  await createSession({ userId: user.id, email: user.email })
  redirect('/')
}

export async function logout(): Promise<void> {
  await destroySession()
  redirect('/login')
}
