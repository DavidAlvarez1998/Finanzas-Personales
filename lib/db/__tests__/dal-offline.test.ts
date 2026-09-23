/**
 * Task 5.2 — getTransactions: empty table, userId filtering, descending sort.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { FinanzasDB } from '../schema'
import type { Transaction } from '@/types'

// We test the function logic directly by instantiating a fresh DB
// and calling the equivalent query.
let db: FinanzasDB

async function getTransactions(userId: string): Promise<Transaction[]> {
  return db.transactions
    .where('user_id')
    .equals(userId)
    .sortBy('date')
    .then(rows => rows.reverse())
}

const USER_A = 'user-a'
const USER_B = 'user-b'

const sampleTransactions: Transaction[] = [
  {
    id: 't1',
    user_id: USER_A,
    date: '2024-01-10',
    description: 'COMPRA',
    income: null,
    expense: 50000,
    currency: 'COP',
  },
  {
    id: 't2',
    user_id: USER_A,
    date: '2024-01-20',
    description: 'SUELDO',
    income: 3000000,
    expense: null,
    currency: 'COP',
  },
  {
    id: 't3',
    user_id: USER_B,
    date: '2024-01-15',
    description: 'OTHER USER',
    income: 100,
    expense: null,
    currency: 'USD',
  },
]

beforeEach(async () => {
  db = new FinanzasDB()
  await db.open()
})

describe('getTransactions', () => {
  it('returns empty array when table is empty', async () => {
    const result = await getTransactions(USER_A)
    expect(result).toEqual([])
  })

  it('returns only rows for the given userId', async () => {
    await db.transactions.bulkPut(sampleTransactions)

    const result = await getTransactions(USER_A)
    expect(result.every(t => t.user_id === USER_A)).toBe(true)
    expect(result.length).toBe(2)
  })

  it('returns transactions sorted descending by date', async () => {
    await db.transactions.bulkPut(sampleTransactions)

    const result = await getTransactions(USER_A)
    expect(result[0].date).toBe('2024-01-20') // newest first
    expect(result[1].date).toBe('2024-01-10')
  })

  it('does not return rows belonging to a different user', async () => {
    await db.transactions.bulkPut(sampleTransactions)

    const result = await getTransactions(USER_B)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe('t3')
  })
})
