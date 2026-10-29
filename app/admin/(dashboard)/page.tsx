'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import {
  Card,
  OrderStatusBadge,
  formatDateTime,
  formatMoney,
} from '@/components/admin/shared'
import { Skeleton } from '@/components/ui/skeleton'

interface RecentOrder {
  id: string
  reference: string
  customerName: string
  customerEmail: string
  status: string
  totalCents: number
  currency: string
  createdAt: string
}

interface Stats {
  totals: {
    users: number
    orders: number
    paidOrders: number
    pendingOrders: number
    revenueCents: number
  }
  recentOrders: RecentOrder[]
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-mist">{label}</span>
      <span className="font-serif text-3xl text-ink">{value}</span>
    </Card>
  )
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats', { cache: 'no-store' })
      if (!response.ok) {
        setError(true)
        return
      }
      setStats((await response.json()) as Stats)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-serif text-3xl text-ink">Dashboard overview</h1>
        <p className="text-sm text-mist">Store activity at a glance.</p>
      </header>

      {error ? (
        <Card className="text-sm text-red-700">Could not load stats. Try refreshing.</Card>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Users" value={String(stats.totals.users)} />
          <StatCard label="Orders" value={String(stats.totals.orders)} />
          <StatCard label="Paid orders" value={String(stats.totals.paidOrders)} />
          <StatCard
            label="Revenue (paid)"
            value={formatMoney(stats.totals.revenueCents)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {['Users', 'Orders', 'Paid orders', 'Revenue'].map((label) => (
            <Skeleton key={label} className="min-h-24" />
          ))}
        </div>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-ink">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-azure hover:underline"
          >
            Manage all orders →
          </Link>
        </div>
        {stats && stats.recentOrders.length > 0 ? (
          <ul className="divide-y divide-border">
            {stats.recentOrders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="font-mono text-xs text-mist">{order.reference}</span>
                <span className="font-medium text-ink">{order.customerName}</span>
                <span className="text-mist">{order.customerEmail}</span>
                <OrderStatusBadge status={order.status} />
                <span className="ml-auto font-semibold text-ink">
                  {formatMoney(order.totalCents, order.currency)}
                </span>
                <span className="w-32 text-right text-xs text-mist">
                  {formatDateTime(order.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 py-6 text-sm text-mist">
            <Users className="h-4 w-4" />
            No orders yet — they will appear here as customers check out.
          </p>
        )}
      </Card>
    </div>
  )
}
