/**
 * Singleton coordinator for the `--banner-h` CSS custom property.
 *
 * Multiple banners (OfflineBanner, ExpiryBanner, …) register their rendered
 * height with a stable key. The module keeps a Map and writes the SUM to
 * `document.documentElement` as `--banner-h`. Each write is idempotent and
 * race-free: a banner registering 0 is treated as unregistered.
 *
 * SSR-safe: `recompute` guards `typeof document`.
 */

const heights = new Map<string, number>()

function recompute(): void {
  if (typeof document === 'undefined') return
  const total = Array.from(heights.values()).reduce((acc, h) => acc + h, 0)
  document.documentElement.style.setProperty('--banner-h', `${total}px`)
}

/**
 * Register (or update) a banner's height contribution.
 * Passing height <= 0 removes the banner's contribution.
 */
export function registerBanner(key: string, height: number): void {
  if (height <= 0) {
    heights.delete(key)
  } else {
    heights.set(key, height)
  }
  recompute()
}

/**
 * Unregister a banner, removing its height contribution.
 * Idempotent — safe to call even if the key was never registered.
 */
export function unregisterBanner(key: string): void {
  heights.delete(key)
  recompute()
}
