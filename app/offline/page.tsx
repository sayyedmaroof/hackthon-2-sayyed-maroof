import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Offline',
  robots: { index: false },
}

export default function OfflinePage() {
  return (
    <section className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-ink/5 text-3xl">
        📶
      </span>
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">You&apos;re offline</h1>
      <p className="mt-4 max-w-md text-lg text-ink/70">
        ScentBuild isn&apos;t available right now. Reconnect to keep blending, or check back once
        you have a signal again — your saved work is safe.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-full bg-ink px-6 py-3 text-ice transition hover:bg-ink/90"
      >
        Try again
      </Link>
    </section>
  )
}
