/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker'
import { Serwist, NetworkFirst } from 'serwist'
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
