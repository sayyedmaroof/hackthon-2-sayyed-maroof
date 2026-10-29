'use client'

import { Minus, Pencil, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { calculatePrice, formatPrice } from '@/lib/pricing'
import { useStudio } from '@/lib/studio-store'

export default function CartPage() {
  const { cart, removeFromCart, setQuantity, clearCart, editCartItem } = useStudio()
  const router = useRouter()

  const totals = cart.reduce(
    (acc, item) => {
      const price = calculatePrice(item.blend.noteIds, item.blend.bottle).unitTotal
      const subtotal = price * item.quantity
      return {
        subtotal: acc.subtotal + subtotal,
        count: acc.count + item.quantity,
      }
    },
    { subtotal: 0, count: 0 },
  )

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-dashed border-border bg-card p-10 shadow-sm">
          <ShoppingBag className="mx-auto size-12 text-azure" />
          <h1 className="mt-4 font-serif text-4xl text-ink">Your cart is empty.</h1>
          <p className="mt-3 text-muted-foreground">Build a fragrance first, then save it to your cart.</p>
          <Link href="/builder" className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid">
            Start building
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">Cart</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl md:text-5xl md:leading-none">Your selections.</h1>
        </div>
        <button type="button" onClick={clearCart} className="text-sm font-medium text-ink underline-offset-4 hover:underline">
          Clear cart
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="space-y-5">
          {cart.map((item) => {
            const unit = calculatePrice(item.blend.noteIds, item.blend.bottle).unitTotal
            return (
              <article key={item.id} className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-serif text-3xl text-ink">{item.blend.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.blend.noteIds.length} notes · {item.blend.bottle.size} ml</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (editCartItem(item.id)) {
                          router.push('/builder')
                          toast('Change the notes, name or bottle, then press "Update cart".', { icon: '✏️' })
                        }
                      }}
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#1E63C8] transition-colors hover:text-[#154FB8]"
                    >
                      <Pencil className="size-4" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-red-700 transition-colors hover:text-red-800"
                    >
                      <Trash2 className="size-4" /> Remove
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} className="rounded-full border border-border bg-white p-2 text-ink">
                      <Minus className="size-4" />
                    </button>
                    <span className="min-w-8 text-center font-medium text-ink">{item.quantity}</span>
                    <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} className="rounded-full border border-border bg-white p-2 text-ink">
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.7rem] uppercase tracking-[0.25em] text-azure">Line total</p>
                    <p className="mt-1 font-serif text-3xl text-ink">{formatPrice(unit * item.quantity)}</p>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <aside className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-azure">Summary</p>
          <div className="mt-4 space-y-3 text-sm text-ink">
            <div className="flex justify-between"><span>Items</span><span>{totals.count}</span></div>
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{formatPrice(0)}</span></div>
          </div>
          <div className="mt-5 rounded-2xl bg-ink p-4 text-ice">
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-azure-light">Total</p>
            <p className="mt-2 font-serif text-4xl">{formatPrice(totals.subtotal)}</p>
          </div>
          <Link href="/checkout" className="mt-5 block rounded-full bg-ink px-5 py-3 text-center text-sm font-medium text-ice transition hover:bg-sapphire-mid">
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </div>
  )
}
