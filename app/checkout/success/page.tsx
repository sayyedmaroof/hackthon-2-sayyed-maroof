'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo } from 'react'
import { useStudio } from '@/lib/studio-store'
import { formatPrice } from '@/lib/pricing'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const { orders } = useStudio()
  const reference = searchParams.get('ref') ?? ''

  const order = useMemo(() => orders.find((entry) => entry.reference === reference) ?? orders[0], [orders, reference])

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-border bg-card p-10 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">Order confirmed</p>
        <h1 className="mt-4 font-serif text-3xl text-ink sm:text-4xl md:text-5xl">Demo checkout complete.</h1>
        <p className="mt-4 text-muted-foreground">This is a simulated storefront demo. No payment was processed.</p>
        {order ? (
          <div className="mt-6 space-y-3 rounded-[1.5rem] border border-border bg-ice/60 p-5 text-left text-ink">
            <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Reference</span><strong>{order.reference}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Customer</span><strong>{order.fullName}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Total</span><strong>{formatPrice(order.total)}</strong></div>
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/account" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid">View my orders</Link>
          <Link href="/explore" className="rounded-full border border-border px-5 py-3 text-sm font-medium text-ink transition hover:bg-ice">Browse more blends</Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading order...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
