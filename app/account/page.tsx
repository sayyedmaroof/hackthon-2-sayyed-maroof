'use client'

import { Droplets, Package, PencilLine, Sparkles, Trash2, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { GlassBottle } from '@/components/glass-bottle'
import { useStudio } from '@/lib/studio-store'
import { useAuth } from '@/lib/auth-store'
import { FAMILY_LABELS } from '@/lib/fragrance-data'
import { calculatePrice, formatPrice } from '@/lib/pricing'
import { EMPTY_BLEND_COLOR, computeProfile } from '@/lib/scoring'
import type { Blend } from '@/lib/types'

function blendMeta(blend: Blend) {
  const profile = computeProfile(blend.noteIds, blend.bottle.concentration)
  const family = profile ? FAMILY_LABELS[profile.family] : null
  const color = profile?.color ?? EMPTY_BLEND_COLOR
  return { profile, family, color }
}

function formatRelative(ms: number) {
  const days = Math.floor((Date.now() - ms) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const date = new Date(ms)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function AccountPage() {
  const { saved, orders, cart, openSaved, deleteSaved } = useStudio()
  const { user, status, openPrompt, logout } = useAuth()
  const router = useRouter()

  const handleLoad = (blend: Blend) => {
    if (openSaved(blend.id)) {
      toast.success(`"${blend.name}" loaded — continue in the builder.`)
      router.push('/builder')
    } else {
      toast.error('Could not load this blend. Refresh and try again.')
    }
  }

  const handleDelete = (blend: Blend) => {
    deleteSaved(blend.id)
    toast(`"${blend.name}" deleted.`, { icon: '🗑️' })
  }

  if (status !== 'authed' || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-dashed border-border bg-card p-10 shadow-sm">
          <User className="mx-auto size-12 text-azure" />
          <h1 className="mt-4 font-serif text-4xl text-ink">Sign in to your account.</h1>
          <p className="mt-3 text-muted-foreground">
            Your cart, saved blends and orders are stored in your account — sign in or create one to
            see them here.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openPrompt('login')}
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => openPrompt('signup')}
              className="rounded-full border border-border bg-white px-6 py-3 text-sm font-medium text-ink transition hover:bg-ice"
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">My account</p>
          <h1 className="mt-3 font-serif text-5xl leading-none text-ink">Welcome back, {user.name.split(' ')[0]}.</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-ice"
        >
          <User className="size-4" /> Sign out
        </button>
      </div>

      {/* Quick stats */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Saved blends', value: saved.length, icon: Sparkles, hint: 'Retrieve any blend with one click' },
          { label: 'Cart items', value: cart.reduce((sum, item) => sum + item.quantity, 0), icon: PencilLine, hint: 'Ready for checkout' },
          { label: 'Demo orders', value: orders.length, icon: Package, hint: 'Simulated purchases' },
        ].map(({ label, value, icon: Icon, hint }) => (
          <article key={label} className="rounded-[2rem] border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-ice p-2.5 text-azure">
                <Icon className="size-5" />
              </span>
              <p className="font-serif text-4xl text-ink">{value}</p>
            </div>
            <p className="mt-3 text-sm font-medium text-ink">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        {/* ── Saved blends ─────────────────────────────────────────── */}
        <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-3xl text-ink">Saved blends</h2>
            <Link
              href="/builder"
              className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-ice transition hover:bg-sapphire-mid"
            >
              New blend
            </Link>
          </div>

          {saved.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-6 text-center">
              <Droplets className="mx-auto size-8 text-azure" />
              <p className="mt-3 font-serif text-xl text-ink">No saved blends yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Build a fragrance in the builder and press “Save blend” to keep it in your account.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {saved.map((blend) => {
                const { profile, family, color } = blendMeta(blend)
                const price = calculatePrice(blend.noteIds, blend.bottle).unitTotal
                const conc = blend.bottle.concentration.toUpperCase()
                return (
                  <article
                    key={blend.id}
                    className="flex items-center gap-4 rounded-3xl border border-border bg-white p-4 shadow-sm transition hover:border-[#1E63C8]/40 hover:shadow-md"
                  >
                    {/* Blended bottle preview */}
                    <Link href="/builder" aria-label={`Open ${blend.name} in the builder`} className="w-16 shrink-0 sm:w-20">
                      <GlassBottle
                        name={blend.name}
                        color={color}
                        bottle={blend.bottle}
                        noteCount={blend.noteIds.length}
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-2xl text-ink">{blend.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {family && (
                          <span className="rounded-full bg-[#1E63C8]/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[#1E63C8]">
                            {family}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {blend.noteIds.length} note{blend.noteIds.length !== 1 ? 's' : ''} · {blend.bottle.size} ml · {conc}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {formatPrice(price)}/bottle · Updated {formatRelative(blend.updatedAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoad(blend)}
                        className="rounded-full bg-[#1E63C8] px-4 py-1.5 text-sm font-medium text-[#F5F9FD] transition hover:bg-[#154FB8]"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(blend)}
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </button>
                    </div>
                  </article>
                )
              })}

              {/* Scent character footnote for the full collection */}
              {saved.length > 0 && (
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  {saved.length} blend{saved.length !== 1 ? 's' : ''} in your collection · loads instantly into the builder
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Demo orders ──────────────────────────────────────────── */}
        <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <h2 className="font-serif text-3xl text-ink">Demo orders</h2>
          {orders.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-6 text-center">
              <Package className="mx-auto size-8 text-azure" />
              <p className="mt-3 font-serif text-xl text-ink">No demo orders yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a simulated checkout once you have a blend in your cart.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-3xl border border-border bg-white p-4 transition hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{order.reference}</p>
                      <p className="text-sm text-muted-foreground">{order.fullName}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-700">
                      Demo
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {order.lines.length} fragrance{order.lines.length !== 1 ? 's' : ''} · {formatPrice(order.total)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
