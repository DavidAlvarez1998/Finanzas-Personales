/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker'
import { Serwist, NetworkFirst, CacheableResponsePlugin } from 'serwist'
import type { PrecacheEntry } from 'serwist'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | PrecacheEntry)[]
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // MUST remain first — navigation matcher must win before defaultCache spreads. See ADR-1.
    {
      matcher: ({ request }: { request: Request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'navigation-cache',
        networkTimeoutSeconds: 3,
        plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
      }),
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

serwist.addEventListeners()
