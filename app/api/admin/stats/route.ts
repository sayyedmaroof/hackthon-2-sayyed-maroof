import { NextResponse } from 'next/server'
import { sql, desc } from 'drizzle-orm'
import { db } from '@/db'
import { orders, users } from '@/db/schema'
import { isAdminAuthenticated } from '@/lib/admin-auth'

/**
 * GET /api/admin/stats — headline numbers for the dashboard overview.
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  }

  const [userStats] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(users)

  const [orderStats] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
      paidCount: sql<number>`count(*) filter (where ${orders.status} = 'paid')`.mapWith(Number),
      pendingCount: sql<number>`count(*) filter (where ${orders.status} = 'pending')`.mapWith(Number),
      revenue: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} = 'paid'), 0)`.mapWith(Number),
    })
    .from(orders)

  const recentOrders = await db
    .select({
      id: orders.id,
      reference: orders.reference,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      status: orders.status,
      totalCents: orders.totalCents,
      currency: orders.currency,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(8)

  return NextResponse.json({
    totals: {
      users: userStats?.count ?? 0,
      orders: orderStats?.count ?? 0,
      paidOrders: orderStats?.paidCount ?? 0,
      pendingOrders: orderStats?.pendingCount ?? 0,
      revenueCents: orderStats?.revenue ?? 0,
    },
    recentOrders: recentOrders.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  })
}
