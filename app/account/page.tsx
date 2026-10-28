'use client'

import { useStudio } from '@/lib/studio-store'
import { formatPrice } from '@/lib/pricing'

export default function AccountPage() {
  const { saved, orders, openSaved, deleteSaved } = useStudio()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-ember">My account</p>
        <h1 className="mt-3 font-serif text-5xl leading-none text-espresso">Saved blends and orders.</h1>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <h2 className="font-serif text-3xl text-espresso">Saved blends</h2>
          {saved.length === 0 ? (
            <p className="mt-4 text-muted-foreground">No saved blends yet. Save one from the builder to keep it handy.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {saved.map((blend) => (
                <article key={blend.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-2xl text-espresso">{blend.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{blend.noteIds.length} notes</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openSaved(blend.id)} className="rounded-full border border-border px-3 py-1.5 text-sm text-espresso transition hover:bg-ivory">Load</button>
                      <button type="button" onClick={() => deleteSaved(blend.id)} className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-100">Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <h2 className="font-serif text-3xl text-espresso">Demo orders</h2>
          {orders.length === 0 ? (
            <p className="mt-4 text-muted-foreground">No demo orders yet. Try a simulated checkout once you have a blend ready.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-espresso">{order.reference}</p>
                      <p className="text-sm text-muted-foreground">{order.fullName}</p>
                    </div>
                    <span className="text-sm font-medium text-emerald-700">Demo</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{order.lines.length} fragrances · {formatPrice(order.total)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
