/**
 * Offline DAL — mirrors lib/supabase/dal.ts signatures but reads from Dexie.
 * All functions return arrays (never throw on empty).
 * Designed to be called from useLiveQuery.
 */
import { db } from './index'
import type { Transaction } from '@/types'

export async function getTransactions(userId: string): Promise<Transaction[]> {
  return db.transactions
    .where('user_id')
    .equals(userId)
    .sortBy('date')
    .then(rows => rows.reverse())
}
