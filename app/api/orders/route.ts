import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { orders, type OrderStatus } from '@/db/schema'
import { getAuthUser } from '@/lib/auth'
import {
  buildOrderLines,
  type ComputedOrderLines,
} from '@/lib/payments/orders'
import { createCheckoutSessionForOrder } from '@/lib/payments/checkout'
import {
  getStripe,
  getStripeConfig,
  generateOrderReference,
  isValidCheckoutAttemptId,
} from '@/lib/stripe'

/**
 * POST — create a pending order + Stripe Checkout Session (hosted Checkout).
 * GET  — persistent order history for the signed-in user.
 *
 * Security-relevant behaviour:
 * - Prices, totals and blend validity are always computed server-side.
 * - user_id comes from the session cookie (never the request body).
 * - Duplicate submissions are made idempotent via the checkout attempt key.
 * - Session creation failures are recorded but never create a fake success.
 */

const MAX_BODY_BYTES = 64 * 1024

function safeRequestError(response: unknown): string {
  // Never echo Stripe internals (API keys, account ids) to the client.
  return response instanceof Error ? 'Payment provider rejected the request.' : 'Unknown error.'
}

export async function POST(request: Request) {
  // ── Configuration check (fail-safe, no secrets leaked) ────────────────
  const config = getStripeConfig()
  if (!config) {
    console.error('[checkout] Stripe not configured: missing STRIPE_SECRET_KEY or NEXT_PUBLIC_APP_URL')
    return NextResponse.json(
      { error: 'Payments are temporarily unavailable. Please try again later.' },
      { status: 503 },
    )
  }

  // ── Payload size guard ────────────────────────────────────────────────
  const contentLength = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Checkout payload is too large.' }, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const data = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>

  // ── Customer details (same rules as before) ───────────────────────────
  const email = typeof data.email === 'string' ? data.email.trim().slice(0, 120) : ''
  const fullName = typeof data.fullName === 'string' ? data.fullName.trim().slice(0, 80) : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (fullName.length < 2) {
    return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 })
  }

  // ── Checkout attempt identifier (drives idempotency) ──────────────────
  // The client generates one per intentional submission; a retry after a
  // failure starts a NEW attempt, but double-clicks/network retries reuse it.
  const attemptId = data.checkoutAttemptId
  if (!isValidCheckoutAttemptId(attemptId)) {
    return NextResponse.json({ error: 'Invalid checkout attempt.' }, { status: 400 })
  }

  // ── Server-side cart validation + pricing ─────────────────────────────
  const rawItems = Array.isArray(data.items) ? data.items.slice(0, 40) : []
  const built = buildOrderLines(rawItems)
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 })
  }
  const computed: ComputedOrderLines = built.value

  // ── Authenticated user: derived server-side only ──────────────────────
  let userId: string | null = null
  try {
    const user = await getAuthUser()
    userId = user?.id ?? null
  } catch {
    // DB hiccup during auth must not block a guest checkout.
    userId = null
  }

  // ── Idempotent order creation / reuse of the same attempt ─────────────
  const existing = await db
    .select()
    .from(orders)
    .where(eq(orders.cartIdempotencyKey, attemptId))
    .limit(1)

  let orderRow = existing[0]
  let insertedNow = false

  if (!orderRow) {
    const inserted = await db
      .insert(orders)
      .values({
        id: crypto.randomUUID(),
        reference: generateOrderReference(),
        userId,
        customerName: fullName,
        customerEmail: email,
        lines: computed.lines,
        subtotalCents: computed.subtotalCents,
        shippingCents: computed.shippingCents,
        totalCents: computed.totalCents,
        currency: 'usd',
        status: 'pending',
        cartIdempotencyKey: attemptId,
      })
      .onConflictDoNothing({ target: orders.cartIdempotencyKey })
      .returning()

    if (inserted.length > 0) {
      orderRow = inserted[0]
      insertedNow = true
    } else {
      // Lost a race with a concurrent request using the same attempt key.
      const raced = await db
        .select()
        .from(orders)
        .where(eq(orders.cartIdempotencyKey, attemptId))
        .limit(1)
      orderRow = raced[0]
    }
  }

  if (!orderRow) {
    // Extremely unlikely: conflicting attempt key + vanished row.
    return NextResponse.json(
      { error: 'Could not start checkout. Please try again.' },
      { status: 503 },
    )
  }

  // A paid attempt can never restart (prevents double-charging through a
  // re-posted attempt id).
  if (orderRow.status === 'paid') {
    return NextResponse.json(
      { error: `Order ${orderRow.reference} is already paid.`, reference: orderRow.reference },
      { status: 409 },
    )
  }

  // Final refunded/failed/expired states are also terminal for this attempt —
  // a new attempt produces a new checkout.
  if (orderRow.status === 'refunded') {
    return NextResponse.json(
      { error: `Order ${orderRow.reference} cannot be paid again.` },
      { status: 409 },
    )
  }

  // ── Reuse an existing, still-open Checkout Session when retries arrive ─
  if (orderRow.stripeSessionId) {
    try {
      const stripe = getStripe()
      if (stripe) {
        const session = await stripe.checkout.sessions.retrieve(orderRow.stripeSessionId)
        if (session.status === 'open') {
          return NextResponse.json({
            orderReference: orderRow.reference,
            checkoutUrl: session.url,
            reused: true,
          })
        }
        if (session.status === 'complete') {
          return NextResponse.json(
            { error: `Order ${orderRow.reference} is already paid.`, reference: orderRow.reference },
            { status: 409 },
          )
        }
        // 'expired' sessions fall through to a new generation below.
      }
    } catch (error) {
      console.error('[checkout] session reuse lookup failed', error instanceof Error ? error.message : error)
      // Fall through: create a new generation.
    }
  }

  // ── Create the Stripe Checkout Session (idempotency-keyed) ────────────
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Payments are temporarily unavailable. Please try again later.' },
      { status: 503 },
    )
  }

  // Session generations: each created session bumps the persisted counter
  // embedded in the Stripe idempotency key. Retrying creation of the SAME
  // generation is cached by Stripe; an expired session gets a new generation.
  const generation = orderRow.stripeSessionId ? orderRow.checkoutGenerations : 0

  try {
    const { session } = await createCheckoutSessionForOrder({
      stripe,
      orderId: orderRow.id,
      reference: orderRow.reference,
      customerEmail: email,
      computed,
      generation,
    })

    // Persist the new session and advance the generation counter.
    const updated = await db
      .update(orders)
      .set({
        stripeSessionId: session.id,
        status: sql<OrderStatus>`CASE WHEN ${orders.status} = 'paid' THEN 'paid' ELSE 'pending' END`,
        checkoutGenerations: generation + 1,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderRow.id))
      .returning({ stripeSessionId: orders.stripeSessionId })

    if (updated.length === 0) {
      throw new Error('order row disappeared during session persistence')
    }

    if (insertedNow) {
      console.log('[checkout] pending order created', { reference: orderRow.reference })
    } else {
      console.log('[checkout] pending order reused', { reference: orderRow.reference, reused: true })
    }

    if (!session.url) {
      // Hosted checkout must always produce a URL; treat absence as a failure.
      throw new Error('session has no url')
    }

    return NextResponse.json({
      orderReference: orderRow.reference,
      checkoutUrl: session.url,
    })
  } catch (error) {
    console.error('[checkout] session creation failed:', safeRequestError(error))
    // Record the failure, keep the order + cart intact, allow retry.
    try {
      await db
        .update(orders)
        .set({ status: 'checkout_creation_failed', updatedAt: new Date() })
        .where(eq(orders.id, orderRow.id))
    } catch (dbError) {
      console.error('[checkout] could not record checkout failure', dbError)
    }
    return NextResponse.json(
      { error: 'Checkout could not be started. Your cart is safe — please try again.' },
      { status: 502 },
    )
  }
}

// ── Order history (authenticated users only) ───────────────────────────────

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Sign in to view your orders.' },
        { status: 401 },
      )
    }

    const rows = await db
      .select({
        reference: orders.reference,
        createdAt: orders.createdAt,
        totalCents: orders.totalCents,
        currency: orders.currency,
        status: orders.status,
        lines: orders.lines,
      })
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(orders.createdAt)

    return NextResponse.json({
      orders: rows
        .slice()
        .reverse()
        .map((row) => ({
          reference: row.reference,
          createdAt: row.createdAt.toISOString(),
          totalCents: row.totalCents,
          currency: row.currency,
          status: row.status,
          items: row.lines.map((line) => ({
            name: line.blendName,
            quantity: line.quantity,
          })),
        })),
    })
  } catch (error) {
    console.error('[orders] history lookup failed:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Could not load your orders right now. Please retry.' },
      { status: 500 },
    )
  }
}
