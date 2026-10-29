'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Search, Users } from 'lucide-react'
import { Card, formatDate, formatMoney } from '@/components/admin/shared'
import { Skeleton } from '@/components/ui/skeleton'

interface AdminUser {
  id: string
  name: string
  email: string
  createdAt: string
  orderCount: number
  totalSpentCents: number
  lastOrderAt: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')

  const load = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`,
        { cache: 'no-store' },
      )
      if (!response.ok) {
        setError(true)
        return
      }
      const data = (await response.json()) as { users?: AdminUser[] }
      setUsers(data.users ?? [])
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load('')
  }, [load])

  // Debounced search — hits the API so the filter works on the server too.
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [query])
  useEffect(() => {
    void load(debounced)
  }, [debounced, load])

  const shown = useMemo(() => users, [users])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-ink">Users</h1>
          <p className="text-sm text-mist">
            {loading ? 'Loading…' : `${shown.length} registered account${shown.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <span className="relative block w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-input bg-white py-2.5 pl-10 pr-3 text-sm text-ink outline-none focus:border-azure"
          />
        </span>
      </header>

      {error ? (
        <Card className="text-sm text-red-700">Could not load users. Try refreshing.</Card>
      ) : shown.length === 0 && !loading ? (
        <Card className="flex items-center gap-2 text-sm text-mist">
          <Users className="h-4 w-4" />
          No users match this search.
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {loading && users.length === 0
            ? Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="min-h-24" />
              ))
            : shown.map((user) => (
                <Link key={user.id} href={`/admin/users/${user.id}`}>
                  <Card className="flex h-full items-center gap-4 transition hover:border-azure">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-frost font-semibold text-ink">
                      {user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{user.name}</span>
                      <span className="block truncate text-sm text-mist">{user.email}</span>
                      <span className="mt-1 block text-xs text-mist">
                        Joined {formatDate(user.createdAt)} · {user.orderCount} order
                        {user.orderCount === 1 ? '' : 's'} · {formatMoney(user.totalSpentCents)} spent
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-mist" />
                  </Card>
                </Link>
              ))}
        </div>
      )}
    </div>
  )
}
