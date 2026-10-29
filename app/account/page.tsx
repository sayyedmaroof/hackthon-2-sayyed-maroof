'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Droplets,
  Folder,
  Package,
  RefreshCcw,
  Sparkles,
  Trash2,
  User,
  Wallet,
} from 'lucide-react'
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

interface AccountOrderItem {
  name: string
  quantity: number
}

interface AccountOrder {
  reference: string
  createdAt: string
  totalCents: number
  currency: string
  status: string
  items: AccountOrderItem[]
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700' },
  refunded: { label: 'Refunded', className: 'bg-slate-100 text-slate-600' },
  payment_failed: { label: 'Payment failed', className: 'bg-red-50 text-red-700' },
  expired: { label: 'Expired', className: 'bg-slate-100 text-slate-600' },
  checkout_creation_failed: { label: 'Checkout failed', className: 'bg-red-50 text-red-700' },
}

function OrderStatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGES[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${badge.className}`}
    >
      {badge.label}
    </span>
  )
}

export default function AccountPage() {
  const { saved, orders, openSaved, deleteSaved } = useStudio()
  const { user, status, openPrompt, logout } = useAuth()
  const router = useRouter()

  // Real order history from the database (GET /api/orders).
  const [history, setHistory] = useState<AccountOrder[]>([])
  const [historyState, setHistoryState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [historyNonce, setHistoryNonce] = useState(0)

  const fetchHistory = useCallback(() => {
    let cancelled = false
    setHistoryState('loading')
    ;(async () => {
      try {
        const response = await fetch('/api/orders', { cache: 'no-store' })
        const data = (await response.json().catch(() => null)) as { orders?: AccountOrder[] } | null
        if (cancelled) return
        if (!response.ok) {
          setHistory([])
          setHistoryState(response.status === 401 ? 'ready' : 'error')
          return
        }
        setHistory(Array.isArray(data?.orders) ? data.orders : [])
        setHistoryState('ready')
      } catch {
        if (!cancelled) setHistoryState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch whenever auth resolves to signed-in (and retry token bumps the key).
  useEffect(fetchHistory, [fetchHistory, historyNonce, status])

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

  const stats = useMemo(() => {
    const totalCents = history
      .filter((order) => order.status === 'paid')
      .reduce((sum, order) => sum + order.totalCents, 0)
    return {
      saved: saved.length,
      orders: history.length,
      spend: formatPrice(totalCents / 100),
    }
  }, [saved.length, history])

  if (status !== 'authed' || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-dashed border-border bg-card p-10 shadow-sm">
          <User className="mx-auto size-12 text-azure" />
          <h1 className="mt-4 font-serif text-4xl text-ink">Sign in to your account.</h1>
          <p className="mt-3 text-muted-foreground">
            Your profile, cart, saved blends and order history live in your account — sign in or create
            one to see them here.
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

  const memberSince = user.createdAt
    ? formatDate(user.createdAt)
    : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ── Profile card ─────────────────────────────────────────── */}
      <section className="mb-8 overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-5 bg-gradient-to-r from-[#1E63C8]/10 via-[#1E63C8]/5 to-transparent p-6 sm:p-8">
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#1E63C8] font-serif text-2xl text-[#F5F9FD] shadow-md sm:size-20 sm:text-3xl"
          >
            {initialsOf(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">My account</p>
            <h1 className="mt-2 truncate font-serif text-4xl leading-none text-ink sm:text-5xl">
              {user.name}
            </h1>
            <p className="mt-2 truncate text-sm text-muted-foreground">{user.email}</p>
            {memberSince && (
              <p className="mt-1 text-xs text-muted-foreground">Member since {memberSince}</p>
            )}
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
        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
          {[
            { label: 'Saved blends', value: stats.saved, icon: Sparkles, hint: 'Stored in your account' },
            { label: 'Orders placed', value: stats.orders, icon: Package, hint: 'From your real history' },
            { label: 'Lifetime spend', value: stats.spend, icon: Wallet, hint: 'Paid orders' },
          ].map(({ label, value, icon: Icon, hint }) => (
            <article key={label} className="bg-card p-5">
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
      </section>

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
              <p className="pt-1 text-center text-xs text-muted-foreground">
                {saved.length} blend{saved.length !== 1 ? 's' : ''} in your collection · loads instantly into the builder
              </p>
            </div>
          )}
        </section>

        {/* ── Order history ────────────────────────────────────────── */}
        <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-3xl text-ink">Order history</h2>
            <button
              type="button"
              onClick={() => setHistoryNonce((n) => n + 1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-ice"
            >
              <RefreshCcw className={`size-3.5 ${historyState === 'loading' ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {historyState === 'loading' ? (
            <div className="mt-5 space-y-3" aria-busy="true" aria-label="Loading your orders">
              {[0, 1, 2].map((n) => (
                <div key={n} className="animate-pulse rounded-3xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="h-4 w-28 rounded bg-ice" />
                    <span className="h-4 w-16 rounded-full bg-ice" />
                  </div>
                  <span className="mt-3 block h-3 w-40 rounded bg-ice" />
                </div>
              ))}
            </div>
          ) : historyState === 'error' ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-6 text-center">
              <Folder className="mx-auto size-8 text-azure" />
              <p className="mt-3 font-serif text-xl text-ink">Could not load your orders.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Something went wrong on our side — press Refresh to try again.
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-6 text-center">
              <Package className="mx-auto size-8 text-azure" />
              <p className="mt-3 font-serif text-xl text-ink">No orders yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a blend to your cart and check out — every purchase shows up here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {history.map((order) => (
                <article key={order.reference} className="rounded-3xl border border-border bg-white p-4 transition hover:shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{order.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        Placed {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {order.items.map((item, index) => (
                      <li key={`${order.reference}-${index}`} className="flex items-baseline justify-between gap-3">
                        <span className="truncate">
                          {item.name}
                          {item.quantity !== 1 ? ` × ${item.quantity}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 border-t border-border pt-3 text-right font-medium text-ink">
                    {formatPrice(order.totalCents / 100)}
                  </p>
                </article>
              ))}

              <p className="pt-1 text-center text-xs text-muted-foreground">
                {history.length} order{history.length !== 1 ? 's' : ''} · newest first
              </p>
            </div>
          )}

          {/* Simulated orders from the demo checkout flow (local only). */}
          {orders.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Demo orders
              </h3>
              <div className="mt-3 space-y-2">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-ice/40 px-4 py-2.5 text-sm">
                    <span className="font-medium text-ink">{order.reference}</span>
                    <span className="text-xs text-muted-foreground">
                      {order.lines.length} fragrance{order.lines.length !== 1 ? 's' : ''} · {formatPrice(order.total)} · demo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
