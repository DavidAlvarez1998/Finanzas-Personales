const KEY = 'finanzas:hydrated'

export function isHydrated(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(KEY) === 'true'
}

export function markHydrated(): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, 'true')
}

export function clearHydrated(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY)
}
