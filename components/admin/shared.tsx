'use client'

export const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700' },
  refunded: { label: 'Refunded', className: 'bg-slate-100 text-slate-600' },
  payment_failed: { label: 'Payment failed', className: 'bg-red-50 text-red-700' },
  expired: { label: 'Expired', className: 'bg-slate-100 text-slate-600' },
  checkout_creation_failed: { label: 'Checkout failed', className: 'bg-red-50 text-red-700' },
}

export const ALL_STATUSES = Object.keys(STATUS_BADGES) as Array<keyof typeof STATUS_BADGES>

export function formatMoney(cents: number, currency = 'usd') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function OrderStatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGES[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${badge.className}`}
    >
      {badge.label}
    </span>
  )
}

export function Card({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-border bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  )
}
