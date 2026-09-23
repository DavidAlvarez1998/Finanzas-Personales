import { FinanzasDB } from './schema'

export const db = new FinanzasDB()

/**
 * Clears all Dexie tables.
 * Use on logout or when switching accounts.
 */
export async function resetDB(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map(t => t.clear()))
  })
}
