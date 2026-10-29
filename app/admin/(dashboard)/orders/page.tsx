'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Package } from 'lucide-react'
import { toast } from 'sonner'
import {
  ALL_STATUSES,
  Card,
  OrderStatusBadge,
  STATUS_BADGES,
  formatDate,
  formatDateTime,
  formatMoney,
} from '@/components/admin/shared'
import { Skeleton } from '@/components/ui/skeleton'

interface AdminOrder {
  id: string
  reference: string
  status: string
  customerName: string
  customerEmail: string
  userId: string | null
  userName: string | null
  subtotalCents: number
  shippingCents: number
  totalCents: number
  currency: string
  itemCount: number
  items: Array<{ name: string; quantity: number }>
  createdAt: string
  paidAt: string | null
}

const FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  ...ALL_STATUSES.map((status) => ({
    value: status,
    label: STATUS_BADGES[status].label,
  })),
]

function OrderRow({ order, onStatusChange, saving }: {
  order: AdminOrder
  onStatusChange: (id: string, status: string) => void
  saving: boolean
}) {
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-mono text-xs text-mist">{order.reference}</span>
        <OrderStatusBadge status={order.status} />
        <span className="font-medium text-ink">
          {order.userName ?? order.customerName}
        </span>
        <span className="text-mist">{order.customerEmail}</span>
        <span className="font-semibold text-ink">
          {formatMoney(order.totalCents, order.currency)}
        </span>
        <span className="text-xs text-mist">
          {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {formatDateTime(order.createdAt)}
          {order.paidAt ? ` · paid ${formatDate(order.paidAt)}` : ''}
        </span>

        <span className="ml-auto flex items-center gap-2">
          {order.userId ? (
            <Link
              href={`/admin/users/${order.userId}`}
              className="text-xs font-medium text-azure hover:underline"
            >
              View user
            </Link>
          ) : (
            <span className="text-xs text-mist">Guest</span>
          )}
          <label className="sr-only" htmlFor={`status-${order.id}`}>
            Update status for {order.reference}
          </label>
          <select
            id={`status-${order.id}`}
            value={order.status}
            disabled={saving}
            onChange={(event) => onStatusChange(order.id, event.target.value)}
            className="rounded-lg border border-input bg-white px-2 py-1.5 text-xs text-ink outline-none focus:border-azure disabled:opacity-50"
          >
            {ALL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_BADGES[status].label}
              </option>
            ))}
          </select>
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-mist">
        {order.items.map((item) => `${item.name} ×${item.quantity}`).join(' · ')}
      </p>
    </li>
  )
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async (statusFilter: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/orders?status=${encodeURIComponent(statusFilter)}`,
        { cache: 'no-store' },
      )
      if (!response.ok) {
        setError(true)
        return
      }
      const data = (await response.json()) as { orders?: AdminOrder[] }
      setOrders(data.orders ?? [])
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  const changeStatus = async (id: string, status: string) => {
    const previous = orders
    setSavingId(id)
    setOrders((current) =>
      current.map((order) => (order.id === id ? { ...order, status } : order)),
    )
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(data?.error ?? 'Could not update the order status.')
        setOrders(previous)
        return
      }
      toast.success(`Order marked as ${STATUS_BADGES[status]?.label ?? status}.`)
    } catch {
      toast.error('Network error — status not saved.')
      setOrders(previous)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-serif text-3xl text-ink">Orders</h1>
        <p className="text-sm text-mist">
          {loading ? 'Loading…' : `${orders.length} order${orders.length === 1 ? '' : 's'} shown`}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === option.value
                ? 'bg-sapphire text-ice'
                : 'bg-white text-mist hover:text-ink border border-border'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <Card className="text-sm text-red-700">Could not load orders. Try refreshing.</Card>
      ) : orders.length === 0 && !loading ? (
        <Card className="flex items-center gap-2 text-sm text-mist">
          <Package className="h-4 w-4" />
          No orders with this status flow here yet.
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {loading && orders.length === 0
              ? Array.from({ length: 3 }).map((_, index) => (
                  <li key={index}><Skeleton className="min-h-16" /></li>
                ))
              : orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onStatusChange={changeStatus}
                    saving={savingId === order.id}
                  />
                ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
