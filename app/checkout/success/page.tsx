'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { formatPrice } from '@/lib/pricing'
import { useStudio } from '@/lib/studio-store'
import type { OrderStatus } from '@/db/schema'

/**
 * Real payment confirmation page.
 *
 * The `session_id` query parameter only identifies which persisted order to
 * look up — it is never treated as proof of payment. Proof comes exclusively
 * from the server-side payment state set by the Stripe webhook.
 */

interface OrderStatusResponse {
  order?: {
    reference: string
    status: OrderStatus
    currency: string
    totalCents: number
    items: { name: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[]
    cartItemIds: string[]
  }
  error?: string
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'pending'; order: OrderStatusResponse['order']; attempts: number }
  | { kind: 'paid'; order: NonNullable<OrderStatusResponse['order']> }
  | { kind: 'failed'; order: OrderStatusResponse['order']; status: OrderStatus }
  | { kind: 'error'; message: string }

const POLL_INTERVAL_MS = 1_500
const MAX_POLLS = 8

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { removeCartItems } = useStudio()

  const [state, setState] = useState<LoadState>(sessionId ? { kind: 'loading' } : { kind: 'error', message: 'Invalid link' })
  const clearedRef = useRef(false)

  const sessionIdValid = useMemo(
    () => typeof sessionId === 'string' && sessionId.startsWith('cs_') && sessionId.length >= 16,
    [sessionId],
  )

  const clearPurchasedEntries = (cartItemIds: string[]) => {
    if (clearedRef.current || cartItemIds.length === 0) return
    clearedRef.current = true
    // Only the entries recorded at checkout are removed; anything added to
    // the cart in the meantime stays. (Only called on verified 'paid'.)
    removeCartItems(cartItemIds)
  }

  // Poll the persisted order status with bounded retries.
  useEffect(() => {
    if (!sessionIdValid) return

    let cancelled = false
    let attempt = 0

    const load = async (): Promise<void> => {
      attempt += 1
      let response: Response | null = null
      try {
        response = await fetch(`/api/orders/status?session_id=${encodeURIComponent(sessionId as string)}`, {
          cache: 'no-store',
        })
      } catch {
        // Network hiccup → show retry state below.
      }

      if (cancelled) return

      const body = response ? ((await response.json().catch(() => null)) as OrderStatusResponse | null) : null

      if (!response || !response.ok) {
        if (attempt >= MAX_POLLS) {
          setState({
            kind: 'error',
            message: body?.error ?? 'We could not confirm your order. Please retry or refresh.',
          })
          return
        }
        setState({ kind: 'loading' })
        window.setTimeout(() => void load(), POLL_INTERVAL_MS)
        return
      }

      if (!body?.order) {
        setState({
          kind: 'error',
          message: 'We could not find an order for this confirmation link.',
        })
        return
      }

      switch (body.order.status) {
        case 'paid': {
          setState({ kind: 'paid', order: body.order })
          clearPurchasedEntries(body.order.cartItemIds)
          return
        }
        case 'payment_failed':
        case 'expired':
        case 'refunded': {
          setState({ kind: 'failed', order: body.order, status: body.order.status })
          return
        }
        default:
          // still pending confirmation (webhook hasn't landed yet)
          if (attempt >= MAX_POLLS) {
            setState({
              kind: 'pending',
              order: body.order,
              attempts: attempt,
            })
            return
          }
          setState({ kind: 'loading' })
          window.setTimeout(() => void load(), POLL_INTERVAL_MS)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdValid])

  const retry = () => window.location.reload()

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-border bg-card p-10 shadow-sm">
        {state.kind === 'error' && !sessionIdValid ? (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">Checkout</p>
            <h1 className="mt-4 font-serif text-3xl text-ink sm:text-4xl">This confirmation link is not valid.</h1>
            <p className="mt-4 text-muted-foreground">No payment confirmation is attached to this link.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/explore" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid">Back to the studio</Link>
            </div>
          </>
        ) : null}

        {sessionIdValid && (state.kind === 'loading') && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">Checkout</p>
            <h1 className="mt-4 font-serif text-3xl text-ink sm:text-4xl">Confirming your payment…</h1>
            <p className="mt-4 text-muted-foreground">Checking with our payment provider. This only takes a moment.</p>
          </>
        )}

        {state.kind === 'paid' && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">Order confirmed</p>
            <h1 className="mt-4 font-serif text-3xl text-ink sm:text-4xl md:text-5xl">Payment received — thank you.</h1>
            <p className="mt-3 text-muted-foreground">Your custom fragrances are on their way.</p>
            <div className="mt-6 space-y-3 rounded-[1.5rem] border border-border bg-ice/60 p-5 text-left text-ink">
              <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Reference</span><strong>{state.order.reference}</strong></div>
              <div className="space-y-2 text-sm">
                {state.order.items.map((item, index) => (
                  <div key={index} className="flex justify-between gap-3">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{formatPrice(item.lineTotalCents / 100)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Total paid</span><strong>{formatPrice(state.order.totalCents / 100)}</strong></div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/account" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid">View my orders</Link>
              <Link href="/explore" className="rounded-full border border-border px-5 py-3 text-sm font-medium text-ink transition hover:bg-ice">Browse more blends</Link>
            </div>
          </>
        )}

        {state.kind === 'pending' && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">Checkout</p>
            <h1 className="mt-4 font-serif text-3xl text-ink sm:text-4xl">Confirmation in progress.</h1>
            <p className="mt-4 max-w-md mx-auto text-muted-foreground">
              We haven't received the final payment confirmation yet. This can take a few seconds —{' '}
              {state.order
                ? <>we'll keep your order <strong>{state.order.reference}</strong> ({formatPrice(state.order.totalCents / 100)}) pending until Stripe confirms it.</>
                : <>we'll keep your order pending until Stripe confirms it.</>}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={retry} className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid">Check again</button>
              <Link href="/account" className="rounded-full border border-border px-5 py-3 text-sm font-medium text-ink transition hover:bg-ice">My orders</Link>
            </div>
          </>
        )}

        {state.kind === 'failed' && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">Checkout</p>
            <h1 className="mt-4 font-serif text-3xl text-ink sm:text-4xl">
              {state.status === 'expired' ? 'Your checkout session expired.' : 'The payment did not go through.'}
            </h1>
            <p className="mt-4 text-muted-foreground">
              {state.order
                ? `Order ${state.order.reference} was not completed and nothing was charged.`
                : 'Nothing was charged.'}{' '}
              Your cart is still there — you can retry the checkout safely.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/cart" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid">Return to cart</Link>
              <Link href="/explore" className="rounded-full border border-border px-5 py-3 text-sm font-medium text-ink transition hover:bg-ice">Browse blends</Link>
            </div>
          </>
        )}

        {state.kind === 'error' && sessionIdValid && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">Checkout</p>
            <h1 className="mt-4 font-serif text-3xl text-ink sm:text-4xl">We couldn't confirm this order.</h1>
            <p className="mt-4 text-muted-foreground">{state.message}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={retry} className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid">Try again</button>
              <Link href="/explore" className="rounded-full border border-border px-5 py-3 text-sm font-medium text-ink transition hover:bg-ice">Browse blends</Link>
            </div>
          </>
        )}
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
