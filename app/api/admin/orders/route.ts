import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders, users, type OrderStatus } from '@/db/schema'
import { isAdminAuthenticated } from '@/lib/admin-auth'

/**
 * GET /api/admin/orders?status=paid — all orders (newest first) joined with
 * the owning account when one exists. `status` is an optional filter.
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status')

  const base = db
    .select({
      id: orders.id,
      reference: orders.reference,
      status: orders.status,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      userId: orders.userId,
      userName: users.name,
      subtotalCents: orders.subtotalCents,
      shippingCents: orders.shippingCents,
      totalCents: orders.totalCents,
      currency: orders.currency,
      lines: orders.lines,
      stripeSessionId: orders.stripeSessionId,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.userId))
    .$dynamic()
    .orderBy(desc(orders.createdAt))
    .limit(200)

  const rows = await (status && status !== 'all'
    ? base.where(eq(orders.status, status as OrderStatus))
    : base)

  return NextResponse.json({
    orders: rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      status: row.status,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      userId: row.userId,
      userName: row.userName,
      subtotalCents: row.subtotalCents,
      shippingCents: row.shippingCents,
      totalCents: row.totalCents,
      currency: row.currency,
      itemCount: row.lines.reduce((sum, line) => sum + line.quantity, 0),
      items: row.lines.map((line) => ({
        name: line.blendName,
        quantity: line.quantity,
      })),
      stripeSessionId: row.stripeSessionId,
      createdAt: row.createdAt.toISOString(),
      paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    })),
  })
}
