'use client'

import { useEffect, useMemo, useState } from 'react'
import { calculatePrice, formatPrice } from '@/lib/pricing'
import { useAuth } from '@/lib/auth-store'
import { useStudio } from '@/lib/studio-store'
import type { ShippingAddress } from '@/lib/payments/address'

const EMPTY_ADDRESS: ShippingAddress = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
}

function CheckoutCanceledNotice() {
  return (
    <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      Payment was cancelled — nothing was charged and your cart is untouched. You can try again
      whenever you're ready.
    </p>
  )
}

export default function CheckoutPage() {
  const { cart } = useStudio()
  const { user, status } = useAuth()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [canceled, setCanceled] = useState(false)

  const searchParams = useMemo(
    () => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search)),
    [],
  )

  // After arriving here from a cancelled Stripe Checkout.
  useEffect(() => {
    if (searchParams?.get('canceled') === '1') setCanceled(true)
  }, [searchParams])

  // Prefill checkout details from the signed-in profile. Only empty fields
  // are filled (functional updates), so any manual edits are never clobbered
  // — including when the session resolves after mount or mid-checkout sign-in.
  useEffect(() => {
    if (status !== 'authed' || !user) return
    setFullName((current) => current || user.name)
    setEmail((current) => current || user.email)
  }, [user, status])

  const subtotal = cart.reduce(
    (sum, item) => sum + calculatePrice(item.blend.noteIds, item.blend.bottle).unitTotal * item.quantity,
    0,
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')

    try {
      // One attempt identifier per intentional submission. Re-clicks or
      // network retries within this request reuse it (server-side
      // idempotency); a retry after a failure starts a fresh attempt.
      const checkoutAttemptId = `chk_${crypto.randomUUID().replace(/-/g, '')}`.slice(0, 64)

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          shippingAddress: address,
          checkoutAttemptId,
          items: cart.map((item) => ({
            id: item.blend.id,
            name: item.blend.name,
            noteIds: item.blend.noteIds,
            bottle: item.blend.bottle,
            quantity: item.quantity,
            cartItemId: item.id,
          })),
        }),
      })

      const result = (await response.json().catch(() => null)) as
        | { checkoutUrl?: string; orderReference?: string; error?: string }
        | null

      if (!response.ok || !result?.checkoutUrl) {
        throw new Error(
          result?.error
            ? sanitizeCheckoutError(result.error)
            : 'Checkout could not be started. Your cart is safe — please try again.',
        )
      }

      // The cart is intentionally NOT cleared here — only the verified
      // payment webhook clears purchased entries (see the success page).
      window.location.assign(result.checkoutUrl)
      // Keep the button disabled while the external redirect happens.
      return
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-dashed border-border bg-card p-10 shadow-sm">
          <h1 className="font-serif text-4xl text-ink">Your cart is empty.</h1>
          <p className="mt-3 text-muted-foreground">Add a blend before continuing to checkout.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">Checkout</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl md:text-5xl md:leading-none">Order details.</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Full name</span>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-full border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-azure" placeholder="Jane Doe" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-full border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-azure" placeholder="jane@example.com" required />
            </label>
          </div>

          <div className="mt-7 border-t border-border pt-6">
            <h2 className="font-serif text-2xl text-ink">Shipping address</h2>
            <p className="mt-1 text-sm text-muted-foreground">Where should we send your custom fragrance?</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-ink">Street address</span>
                <input autoComplete="address-line1" maxLength={120} value={address.line1} onChange={(event) => setAddress((current) => ({ ...current, line1: event.target.value }))} className="w-full rounded-full border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-azure" placeholder="123 Main Street" required />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-ink">Apartment, suite, etc. <span className="font-normal text-muted-foreground">(optional)</span></span>
                <input autoComplete="address-line2" maxLength={120} value={address.line2} onChange={(event) => setAddress((current) => ({ ...current, line2: event.target.value }))} className="w-full rounded-full border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-azure" placeholder="Apartment 4B" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">City</span>
                <input autoComplete="address-level2" maxLength={80} value={address.city} onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))} className="w-full rounded-full border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-azure" required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">State / Region</span>
                <input autoComplete="address-level1" maxLength={80} value={address.state} onChange={(event) => setAddress((current) => ({ ...current, state: event.target.value }))} className="w-full rounded-full border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-azure" required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Postal code</span>
                <input autoComplete="postal-code" maxLength={24} value={address.postalCode} onChange={(event) => setAddress((current) => ({ ...current, postalCode: event.target.value }))} className="w-full rounded-full border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-azure" required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Country</span>
                <input autoComplete="country-name" maxLength={80} value={address.country} onChange={(event) => setAddress((current) => ({ ...current, country: event.target.value }))} className="w-full rounded-full border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-azure" placeholder="United States" required />
              </label>
            </div>
          </div>

          {canceled && <CheckoutCanceledNotice />}
          {error && <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={submitting} className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Redirecting to secure checkout…' : 'Continue to payment'}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            You'll complete payment on the secure Stripe page — your blend details travel with it.
          </p>
        </form>

        <aside className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-azure">Order summary</p>
          <div className="mt-4 space-y-3 text-sm text-ink">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between gap-3">
                <span>{item.blend.name} × {item.quantity}</span>
                <span>{formatPrice(calculatePrice(item.blend.noteIds, item.blend.bottle).unitTotal * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="mt-2 flex justify-between"><span>Shipping</span><span>{formatPrice(0)}</span></div>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-ink p-4 text-ice">
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-azure-light">Total</p>
            <p className="mt-2 font-serif text-4xl">{formatPrice(subtotal)}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

/** Server messages are already client-safe; trim + de-URL for display. */
function sanitizeCheckoutError(message: string): string {
  return message.slice(0, 200)
}
