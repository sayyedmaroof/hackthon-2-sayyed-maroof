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
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-ember">Order confirmed</p>
        <h1 className="mt-4 font-serif text-5xl text-espresso">Demo checkout complete.</h1>
        <p className="mt-4 text-muted-foreground">This is a simulated storefront demo. No payment was processed.</p>
        {order ? (
          <div className="mt-6 space-y-3 rounded-[1.5rem] border border-border bg-ivory/60 p-5 text-left text-espresso">
            <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Reference</span><strong>{order.reference}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Customer</span><strong>{order.fullName}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Total</span><strong>{formatPrice(order.total)}</strong></div>
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/account" className="rounded-full bg-espresso px-5 py-3 text-sm font-medium text-ivory transition hover:bg-walnut">View my orders</Link>
          <Link href="/explore" className="rounded-full border border-border px-5 py-3 text-sm font-medium text-espresso transition hover:bg-ivory">Browse more blends</Link>
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
