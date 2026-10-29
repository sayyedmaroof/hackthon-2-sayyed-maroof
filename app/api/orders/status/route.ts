import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { isValidStripeSessionId } from '@/lib/stripe'
import { orderSummaryLines } from '@/lib/payments/orders'

/**
 * Read-only order status lookup for the checkout success page.
 *
 * The query-string `session_id` is an unguessable Stripe Checkout Session id
 * previously persisted against a pending order. It is NEVER proof of payment
 * by itself — payment state is whatever the DB row says after verified
 * webhook processing.
 *
 * Response is deliberately minimal: no auth data, no raw DB rows, no secrets.
 */

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get('session_id')

  if (!isValidStripeSessionId(sessionId ?? '')) {
    return NextResponse.json(
      { error: 'This confirmation link is not valid.' },
      { status: 400 },
    )
  }

  try {
    const rows = await db
      .select({
        reference: orders.reference,
        status: orders.status,
        currency: orders.currency,
        totalCents: orders.totalCents,
        lines: orders.lines,
      })
      .from(orders)
      .where(eq(orders.stripeSessionId, sessionId as string))
      .limit(1)

    const order = rows[0]
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    return NextResponse.json({
      order: {
        reference: order.reference,
        status: order.status,
        currency: order.currency,
        totalCents: order.totalCents,
        items: orderSummaryLines(order.lines),
        // Cart item IDs recorded at checkout — used only to clear purchased
        // entries from the local cart when payment is confirmed.
        cartItemIds: order.lines
          .map((line) => line.cartItemId)
          .filter((id): id is string => Boolean(id)),
      },
    })
  } catch (error) {
    console.error('[orders:status] lookup failed:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Could not load order status right now. Please retry.' },
      { status: 500 },
    )
  }
}
