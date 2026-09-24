/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker'
import {
  Serwist,
  NetworkFirst,
  CacheableResponsePlugin,
  PrecacheFallbackPlugin,
} from 'serwist'
import type { PrecacheEntry } from 'serwist'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | PrecacheEntry)[]
}

// navStrategy is declared before serwist so PrecacheFallbackPlugin can receive
// the fully-constructed serwist instance via push() after assignment — avoiding
// the null-capture bug that occurs when serwist is referenced inside its own
// constructor (the plugin stores the reference by value, not by variable).
const navStrategy = new NetworkFirst({
  cacheName: 'navigation-cache',
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
  ],
})

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // D1: disable browser Navigation Preload — it races with NetworkFirst offline
  // and can surface a network error before the SW cache fallback runs.
  navigationPreload: false,
  runtimeCaching: [
    // MUST remain first — navigation matcher must win before defaultCache spreads.
    {
      matcher: ({ request }: { request: Request }) => request.mode === 'navigate',
      handler: navStrategy,
    },
    ...defaultCache,
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: 'api',
        networkTimeoutSeconds: 4,
      }),
    },
  ],
})

// D2: push AFTER serwist is fully constructed so _serwist is never null.
// PrecacheFallbackPlugin resolves the correct __WB_REVISION__ key automatically.
navStrategy.plugins.push(new PrecacheFallbackPlugin({
  fallbackUrls: ['/offline.html'],
  serwist,
}))

serwist.addEventListeners()
