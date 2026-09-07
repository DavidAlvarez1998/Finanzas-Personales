import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Control de Finanzas Personales',
    short_name: 'Finanzas',
    description: 'Gestión personal de ingresos, egresos y deudas',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: '#09090b',
    background_color: '#09090b',
    display: 'standalone',
    start_url: '/',
    scope: '/',
  }
}
