/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    // Wikimedia Commons hosts the note images in data/notes-images.json.
    // Not strictly required while unoptimized is true, but keeps next/image
    // working if optimization is ever enabled.
    remotePatterns: [
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'thumb.wikimedia.org' },
    ],
  },
  async headers() {
    return [
      {
        // Never cache the service worker — users must always receive the latest
        // version so old caches are cleaned up correctly.
        // https://nextjs.org/docs/app/guides/progressive-web-apps
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ]
  },
}

export default nextConfig
