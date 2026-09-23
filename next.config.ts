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
    })(nextConfig)
  : nextConfig
