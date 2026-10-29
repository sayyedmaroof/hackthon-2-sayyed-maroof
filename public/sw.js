/* ScentBuild Studio service worker — offline fallback + runtime caching. */
const VERSION = 'v1'
const STATIC_CACHE = `scentbuild-static-${VERSION}`
const PAGE_CACHE = `scentbuild-pages-${VERSION}`

// Precached on install so the app can boot offline.
const PRECACHE_URLS = [
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Do not block activation if a precache entry fails to fetch.
      .catch((error) => console.warn('[sw] precache incomplete:', error))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  const keep = [STATIC_CACHE, PAGE_CACHE]
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => (keep.includes(key) ? null : caches.delete(key))))
      )
      .then(() => self.clients.claim())
  )
})

// The client component asks the waiting worker to take over when an update is applied.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests; POST, API calls and cross-origin
  // traffic (fonts, Wikimedia images) go straight to the network.
  if (url.origin !== self.location.origin || request.method !== 'GET') {
    return
  }

  if (url.pathname.startsWith('/api/')) {
    return
  }

  if (request.mode === 'navigate') {
    // Navigations: network first so users see fresh pages, falling back to the
    // last cached copy of the URL and finally the offline page.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          const pageCache = await caches.open(PAGE_CACHE)
          return (
            (await pageCache.match(request)) ||
            (await caches.match(request)) ||
            (await pageCache.match('/offline')) ||
            (await caches.match('/offline')) ||
            new Response('You are offline.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          )
        })
    )
    return
  }

  const isNextStatic = url.pathname.startsWith('/_next/static')
  const isPublicAsset =
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/apple-icon.png') ||
    url.pathname.startsWith('/icon-')

  // Never cache the service worker itself — it must always fetch the newest copy.
  if (url.pathname === '/sw.js') {
    return
  }

  if (isNextStatic) {
    // Immutable + content-hashed, so cache-first is safe and fast.
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  // Everything else (public images, icons, ad-hoc pages): stale-while-revalidate.
  event.respondWith(
    caches.open(isPublicAsset ? STATIC_CACHE : PAGE_CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(() => undefined)
      return cached || (await network) || new Response('Not available offline.', { status: 503 })
    })
  )
})
