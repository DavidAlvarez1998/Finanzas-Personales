'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function login(
  formData: FormData
): Promise<{ error: string } | void> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Email y contraseña son requeridos.' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Credenciales inválidas. Verificá tu email y contraseña.' }
  }

  redirect('/')
}

export async function register(
  formData: FormData
): Promise<{ error: string } | void> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Email y contraseña son requeridos.' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'El email ya está registrado.' }
    }
    return { error: error.message }
  }

  redirect('/')
}

export async function logout(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
