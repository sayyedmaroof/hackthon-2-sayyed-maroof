import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders, type OrderStatus } from '@/db/schema'
import { isAdminAuthenticated } from '@/lib/admin-auth'

/**
 * PATCH /api/admin/orders/[id] — order status management. Accepts any valid
 * OrderStatus; `paid` also stamps paidAt, other statuses clear it.
 */
const VALID_STATUSES: readonly OrderStatus[] = [
  'pending',
  'paid',
  'payment_failed',
  'expired',
  'checkout_creation_failed',
  'refunded',
]

interface PatchBody {
  status?: unknown
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  }

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const status = body.status
  if (
    typeof status !== 'string' ||
    !VALID_STATUSES.includes(status as OrderStatus)
  ) {
    return NextResponse.json(
      { error: `Status must be one of: ${VALID_STATUSES.join(', ')}.` },
      { status: 400 },
    )
  }

  const { id } = await params

  const updated = await db
    .update(orders)
    .set({
      status: status as OrderStatus,
      updatedAt: new Date(),
      paidAt: status === 'paid' ? new Date() : null,
    })
    .where(eq(orders.id, id))
    .returning({
      id: orders.id,
      reference: orders.reference,
      status: orders.status,
      totalCents: orders.totalCents,
      currency: orders.currency,
    })

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  return NextResponse.json({ order: updated[0] })
}
