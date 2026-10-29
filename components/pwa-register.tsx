'use client'

import { useEffect, useState } from 'react'

/**
 * Registers the service worker that powers offline support for the PWA.
 * Renders nothing — it is purely a side-effect component mounted in the root layout.
 */
export function PWARegister() {
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let waitingWorker: ServiceWorker | null = null

    const onControllerChange = () => window.location.reload()

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        // Detect a newly waiting worker so we can offer an update prompt.
        if (registration.waiting) {
          waitingWorker = registration.waiting
          setShowUpdate(true)
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorker = installing
              setShowUpdate(true)
            }
          })
        })

        // Reload the page once a waiting worker takes control after an update.
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
      } catch (error) {
        console.warn('Service worker registration failed:', error)
      }
    }

    register()

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  // A new version is ready: let the user apply it now, or dismiss until next time.
  if (!showUpdate) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-[90] mx-auto flex w-fit items-center gap-4 rounded-full border border-ice/10 bg-ink px-5 py-3 text-sm text-ice shadow-lg sm:bottom-24"
    >
      <span>New version of ScentBuild ready.</span>
      <button
        type="button"
        className="rounded-full bg-ice px-3 py-1 font-medium text-ink transition hover:bg-ice/90"
        onClick={() => {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            const waiting = registrations.find((r) => r.waiting)?.waiting
            waiting?.postMessage('SKIP_WAITING')
          })
          setShowUpdate(false)
        }}
      >
        Refresh
      </button>
      <button
        type="button"
        aria-label="Dismiss update"
        className="text-ice/60 transition hover:text-ice"
        onClick={() => setShowUpdate(false)}
      >
        ✕
      </button>
    </div>
  )
}
