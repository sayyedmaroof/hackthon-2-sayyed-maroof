'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculatePrice, formatPrice } from '@/lib/pricing'
import { useStudio } from '@/lib/studio-store'

export default function CheckoutPage() {
  const { cart, clearCart, recordOrder } = useStudio()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const subtotal = cart.reduce(
    (sum, item) => sum + calculatePrice(item.blend.noteIds, item.blend.bottle).unitTotal * item.quantity,
    0,
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          items: cart.map((item) => ({
            id: item.blend.id,
            name: item.blend.name,
            noteIds: item.blend.noteIds,
            bottle: item.blend.bottle,
            quantity: item.quantity,
          })),
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Checkout failed.')
      }

      recordOrder(result.order)
      clearCart()
      router.push(`/checkout/success?ref=${result.order.reference}`)
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
        <h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl md:text-5xl md:leading-none">Demo order details.</h1>
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

          {error && <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={submitting} className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Submitting demo order...' : 'Complete demo checkout'}
          </button>
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
