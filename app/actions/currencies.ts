'use server'

import { verifySession } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { WORLD_CURRENCIES } from '@/lib/constants/currencies'

const VALID_CODES = new Set(WORLD_CURRENCIES.map(c => c.code))

export async function updateUserCurrencies(
  codes: string[]
): Promise<{ error: string } | void> {
  const { userId } = await verifySession()
  const safe = codes.filter(c => VALID_CODES.has(c))
  const supabase = createServerClient()
  const { error } = await supabase
    .from('users')
    .update({ currencies: safe })
    .eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/')
}
