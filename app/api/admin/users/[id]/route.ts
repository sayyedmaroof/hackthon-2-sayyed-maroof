import { NextResponse } from 'next/server'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { cartItems, orders, savedBlends, users } from '@/db/schema'
import { isAdminAuthenticated } from '@/lib/admin-auth'

/**
 * GET /api/admin/users/[id] — a full customer view: profile, orders, the
 * current cart and saved blends.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  }

  const { id } = await params

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  const user = userRows[0]
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  const orderRows = await db
    .select({
      id: orders.id,
      reference: orders.reference,
      status: orders.status,
      subtotalCents: orders.subtotalCents,
      shippingCents: orders.shippingCents,
      totalCents: orders.totalCents,
      currency: orders.currency,
      lines: orders.lines,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
    })
    .from(orders)
    .where(eq(orders.userId, id))
    .orderBy(desc(orders.createdAt))
    .limit(100)

  const cartRows = await db
    .select({
      itemId: cartItems.itemId,
      blend: cartItems.blend,
      quantity: cartItems.quantity,
      createdAt: cartItems.createdAt,
    })
    .from(cartItems)
    .where(eq(cartItems.userId, id))
    .orderBy(desc(cartItems.createdAt))

  const [savedCount] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(savedBlends)
    .where(eq(savedBlends.userId, id))

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      savedBlendCount: savedCount?.count ?? 0,
    },
    orders: orderRows.map((row) => ({
      id: row.id,
      reference: row.reference,
      status: row.status,
      subtotalCents: row.subtotalCents,
      shippingCents: row.shippingCents,
      totalCents: row.totalCents,
      currency: row.currency,
      createdAt: row.createdAt.toISOString(),
      paidAt: row.paidAt ? row.paidAt.toISOString() : null,
      itemCount: row.lines.reduce((sum, line) => sum + line.quantity, 0),
      items: row.lines.map((line) => ({
        name: line.blendName,
        quantity: line.quantity,
      })),
    })),
    cart: cartRows.map((row) => ({
      itemId: row.itemId,
      name: row.blend.name,
      quantity: row.quantity,
      createdAt: row.createdAt.toISOString(),
    })),
  })
}
