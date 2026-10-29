import type { MetadataRoute } from 'next'

const description =
  'Design a fragrance that is truly yours. Layer top, heart and base notes, get guided by our scent concierge, and preview your bottle before you buy.'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ScentBuild Studio — Your Custom Fragrance Builder',
    short_name: 'ScentBuild',
    description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#051334',
    theme_color: '#051334',
    categories: ['shopping', 'lifestyle', 'beauty'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
