import { NextResponse } from 'next/server'
import { desc, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { orders, users } from '@/db/schema'
import { isAdminAuthenticated } from '@/lib/admin-auth'

/**
 * GET /api/admin/users?q=term — every registered account with derived order
 * activity (order count, paid spend, most recent order).
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  }

  const url = new URL(request.url)
  const query = (url.searchParams.get('q') ?? '').trim()

  const base = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      orderCount: sql<number>`count(${orders.id})`.mapWith(Number),
      totalSpentCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} = 'paid'), 0)`.mapWith(Number),
      lastOrderAt: sql<Date | null>`max(${orders.createdAt})`,
    })
    .from(users)
    .leftJoin(orders, sql`${orders.userId} = ${users.id}`)
    .groupBy(users.id)

  const rows = base
    .$dynamic()
    .where(
      query
        ? or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`))
        : undefined,
    )
    .orderBy(desc(users.createdAt))

  const list = await rows

  return NextResponse.json({
    users: list.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt.toISOString(),
      orderCount: row.orderCount,
      totalSpentCents: row.totalSpentCents,
      lastOrderAt: row.lastOrderAt ? new Date(row.lastOrderAt).toISOString() : null,
    })),
  })
}
