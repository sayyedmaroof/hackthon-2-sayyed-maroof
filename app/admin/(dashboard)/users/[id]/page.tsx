'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Mail, ShoppingBag, Sparkles } from 'lucide-react'
import {
  Card,
  OrderStatusBadge,
  formatDate,
  formatMoney,
} from '@/components/admin/shared'
import { Skeleton } from '@/components/ui/skeleton'

interface UserDetail {
  user: {
    id: string
    name: string
    email: string
    createdAt: string
    savedBlendCount: number
  }
  orders: Array<{
    id: string
    reference: string
    status: string
    subtotalCents: number
    shippingCents: number
    totalCents: number
    currency: string
    createdAt: string
    paidAt: string | null
    itemCount: number
    items: Array<{ name: string; quantity: number }>
  }>
  cart: Array<{
    itemId: string
    name: string
    quantity: number
    createdAt: string
  }>
}

export default function AdminUserProfilePage() {
  const params = useParams<{ id: string }>()
  const userId = params.id

  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [error, setError] = useState<'missing' | 'error' | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { cache: 'no-store' })
      if (response.status === 404) {
        setError('missing')
        return
      }
      if (!response.ok) {
        setError('error')
        return
      }
      setDetail((await response.json()) as UserDetail)
      setError(null)
    } catch {
      setError('error')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const totalSpent = detail
    ? detail.orders
        .filter((order) => order.status === 'paid')
        .reduce((sum, order) => sum + order.totalCents, 0)
    : 0

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/users"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-mist hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All users
      </Link>

      {error === 'missing' ? (
        <Card className="text-sm text-red-700">This user no longer exists.</Card>
      ) : error === 'error' ? (
        <Card className="text-sm text-red-700">Could not load this user. Try refreshing.</Card>
      ) : detail ? (
        <>
          <Card className="flex flex-wrap items-center gap-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sapphire font-serif text-2xl text-ice">
              {detail.user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-3xl text-ink">{detail.user.name}</h1>
              <p className="flex items-center gap-1.5 text-sm text-mist">
                <Mail className="h-3.5 w-3.5" />
                {detail.user.email}
              </p>
              <p className="text-xs text-mist">Member since {formatDate(detail.user.createdAt)}</p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="font-serif text-2xl text-ink">{detail.orders.length}</p>
                <p className="text-xs uppercase tracking-wide text-mist">Orders</p>
              </div>
              <div>
                <p className="font-serif text-2xl text-ink">{formatMoney(totalSpent)}</p>
                <p className="text-xs uppercase tracking-wide text-mist">Paid total</p>
              </div>
              <div>
                <p className="flex items-center justify-center gap-1 font-serif text-2xl text-ink">
                  <Sparkles className="h-4 w-4" />
                  {detail.user.savedBlendCount}
                </p>
                <p className="text-xs uppercase tracking-wide text-mist">Saved blends</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <Card>
                <h2 className="mb-3 font-serif text-xl text-ink">Order history</h2>
                {detail.orders.length === 0 ? (
                  <p className="py-4 text-sm text-mist">This user has not placed any orders yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {detail.orders.map((order) => (
                      <li key={order.id} className="py-3">
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="font-mono text-xs text-mist">{order.reference}</span>
                          <OrderStatusBadge status={order.status} />
                          <span className="font-semibold text-ink">
                            {formatMoney(order.totalCents, order.currency)}
                          </span>
                          <span className="text-xs text-mist">
                            {formatDate(order.createdAt)} · {order.itemCount} item
                            {order.itemCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-mist">
                          {order.items.map((item) => `${item.name} ×${item.quantity}`).join(' · ')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card>
              <div className="mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-mist" />
                <h2 className="font-serif text-xl text-ink">Current cart</h2>
              </div>
              {detail.cart.length === 0 ? (
                <p className="py-4 text-sm text-mist">Cart is empty.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {detail.cart.map((item) => (
                    <li key={item.itemId} className="py-3 text-sm">
                      <p className="font-medium text-ink">{item.name}</p>
                      <p className="text-xs text-mist">
                        Qty {item.quantity} · added {formatDate(item.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : (
        <Skeleton className="min-h-32" />
      )}
      {loading && null}
    </div>
  )
}
