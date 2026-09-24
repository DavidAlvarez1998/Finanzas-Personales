import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const nextConfig: NextConfig = {
  turbopack: {},
}

const offlineEnabled = process.env.NEXT_PUBLIC_OFFLINE === '1'

export default offlineEnabled
  ? withSerwistInit({
      swSrc: 'app/sw.ts',
      swDest: 'public/sw.js',
      // D3: precache the offline fallback page so it is available on cold-start offline.
      // Note: additionalPrecacheEntries is replaced with [] in `next dev` — QA requires
      // a prod build: NEXT_PUBLIC_OFFLINE=1 next build && next start.
      // Bump `revision` whenever public/offline.html is edited.
      additionalPrecacheEntries: [{ url: '/offline.html', revision: '1' }],
    })(nextConfig)
  : nextConfig
