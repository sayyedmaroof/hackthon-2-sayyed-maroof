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
}

export default nextConfig
