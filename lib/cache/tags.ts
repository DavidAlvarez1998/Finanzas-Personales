export const CACHE_TAGS = {
  transactions: 'transactions',
  debts: 'debts',
  investments: 'investments',
  savings: 'savings',
  ahorros: 'ahorros',
  presupuestos: 'presupuestos',
  userSettings: 'user-settings',
} as const

export type CacheEntity = keyof typeof CACHE_TAGS

export function tagFor(entity: CacheEntity, userId: string): string {
  return `${CACHE_TAGS[entity]}:${userId}`
}
