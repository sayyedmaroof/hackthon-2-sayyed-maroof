import type Stripe from 'stripe'
import type { OrderLineRecord } from '@/db/schema'
import { appUrl } from '@/lib/stripe'
import { bottleSummary } from '@/lib/pricing'
import type { ComputedOrderLines } from '@/lib/payments/orders'
import type { ShippingAddress } from '@/lib/payments/address'

/**
 * Stripe Checkout Session orchestration.
 * The Stripe client is injected, so tests can pass mocks instead of the real
 * API. Redirect URLs are always validated server-side (see lib/stripe.ts) —
 * Host/forwarded-host headers are never trusted for payment redirects.
 */

export interface CreateSessionInput {
  stripe: Stripe
  orderId: string
  reference: string
  customerEmail: string
  shippingAddress: ShippingAddress
  computed: ComputedOrderLines
  /**
   * Generation counter for checkout sessions created for this order.
   * It is part of the Stripe idempotency key: retrying creation of the SAME
   * session generation is deduplicated by Stripe, while a new generation
   * (e.g. the previous session expired) produces a genuinely new session.
   */
  generation: number
}

export interface CreateSessionResult {
  session: Stripe.Checkout.Session
  idempotencyKey: string
}

/** Stripe Checkout line items derived from server-computed order lines. */
export function buildCheckoutLineItems(
  lines: OrderLineRecord[],
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return lines.map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency: 'usd',
      unit_amount: line.unitPriceCents,
      product_data: {
        // product_data.name has a 350-char budget; slice defensively.
        name: line.blendName.slice(0, 120),
        description: buildLineDescription(line).slice(0, 350),
      },
    },
  }))
}

function buildLineDescription(line: OrderLineRecord): string {
  const summary = bottleSummary({
    size: line.bottle.size as 30 | 50 | 100,
    concentration: line.bottle.concentration as never,
    bottleType: line.bottle.bottleType as never,
    atomizerMaterial: line.bottle.atomizerMaterial as never,
    atomizerType: line.bottle.atomizerType as never,
    labelStyle: line.bottle.labelStyle as never,
    base: line.bottle.base as never,
  })
  const noteCount = line.noteIds.length
  return `${noteCount} custom note${noteCount !== 1 ? 's' : ''} · ${summary}`
}

export async function createCheckoutSessionForOrder(
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const { stripe, orderId, reference, customerEmail, shippingAddress, computed, generation } = input

  const idempotencyKey = `checkout:${orderId}:g${generation}`

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      currency: 'usd',
      customer_email: customerEmail,
      client_reference_id: reference,
      line_items: buildCheckoutLineItems(computed.lines),
      success_url: appUrl('/checkout/success?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: appUrl('/checkout?canceled=1'),
      metadata: {
        orderId,
        orderRef: reference,
        shipping_line1: shippingAddress.line1,
        ...(shippingAddress.line2 ? { shipping_line2: shippingAddress.line2 } : {}),
        shipping_city: shippingAddress.city,
        shipping_state: shippingAddress.state,
        shipping_postal_code: shippingAddress.postalCode,
        shipping_country: shippingAddress.country,
      },
      payment_intent_data: {
        metadata: {
          orderId,
          orderRef: reference,
        },
      },
    },
    { idempotencyKey },
  )

  return { session, idempotencyKey }
}
