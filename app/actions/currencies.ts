'use server'

import { getSessionForAction } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { WORLD_CURRENCIES } from '@/lib/constants/currencies'

const VALID_CODES = new Set(WORLD_CURRENCIES.map(c => c.code))

export async function updateUserCurrencies(
  codes: string[]
): Promise<{ error: string } | { row: { currencies: string[] } }> {
  const session = await getSessionForAction()
  if (!session) return { error: 'Unauthorized' }
  const { userId } = session
  const safe = codes.filter(c => VALID_CODES.has(c))
  const supabase = createServerClient()
  const { error } = await supabase
    .from('users')
    .update({ currencies: safe })
    .eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/')
  return { row: { currencies: safe } }
}

export async function updateDisplayCurrency(
  code: string | null
): Promise<{ error: string } | { row: { display_currency: string | null } }> {
  if (code !== null && !VALID_CODES.has(code)) return { error: 'Divisa inválida' }
  const session = await getSessionForAction()
  if (!session) return { error: 'Unauthorized' }
  const { userId } = session
  const supabase = createServerClient()
  const { error } = await supabase
    .from('users')
    .update({ display_currency: code })
    .eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/')
  return { row: { display_currency: code } }
}
