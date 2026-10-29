import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Stripe Checkout session creation.
 * The Stripe client is injected — these tests use a mock client and assert
 * the exact session params + idempotency key produced by our code.
 */

vi.mock('../../lib/stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/stripe')>()
  // Keep pure helpers; only the real SDK client creation is neutralised.
  return actual
})

import { buildCheckoutLineItems, createCheckoutSessionForOrder } from '../../lib/payments/checkout'
import type { ComputedOrderLines } from '../../lib/payments/orders'

const computed: ComputedOrderLines = {
  lines: [
    {
      blendId: 'blend_1',
      blendName: 'Amber Vanilla',
      noteIds: ['bergamot', 'vanilla', 'musk'],
      bottle: {
        size: 50,
        concentration: 'edp',
        bottleType: 'classic',
        atomizerMaterial: 'plastic',
        atomizerType: 'normal',
        labelStyle: 'ivory',
        base: 'alcohol',
      },
      cartItemId: 'item_1',
      quantity: 2,
      unitPriceCents: 8_430,
      lineTotalCents: 16_860,
    },
  ],
  cartItemIds: ['item_1'],
  subtotalCents: 16_860,
  shippingCents: 0,
  totalCents: 16_860,
}

describe('buildCheckoutLineItems', () => {
  it('sends server-computed cents, USD currency, original quantities', () => {
    const items = buildCheckoutLineItems(computed.lines)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      quantity: 2,
      price_data: {
        currency: 'usd',
        unit_amount: 8_430,
      },
    })
    expect(items[0].price_data?.product_data?.name).toBe('Amber Vanilla')
    // Description summarises bottle + options (not the catalog).
    expect(items[0].price_data?.product_data?.description).toMatch(/50 ml/)
  })
})

describe('createCheckoutSessionForOrder', () => {
  const mockSession = {
    id: 'cs_test_1234567890',
    url: 'https://checkout.stripe.com/c/pay/cs_test_1234567890',
    status: 'open',
  }

  const makeStripe = () =>
    ({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue(mockSession),
        },
      },
    }) as never

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://hackthon-2-sayyed-maroof.vercel.app'
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_tests'
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.STRIPE_SECRET_KEY
  })

  it('creates a hosted payment session with trusted redirect URLs and metadata', async () => {
    const stripe = makeStripe()
    const result = await createCheckoutSessionForOrder({
      stripe,
      orderId: 'order_uuid',
      reference: 'SB-ABCDEFGHJK',
      customerEmail: 'jane@example.com',
      shippingAddress: {
        line1: '123 Main Street',
        line2: '',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
      },
      computed,
      generation: 0,
    })

    expect(result.session).toBe(mockSession)
    expect(result.idempotencyKey).toBe('checkout:order_uuid:g0')

    const create = (stripe as { checkout: { sessions: { create: ReturnType<typeof vi.fn> } } }).checkout.sessions
      .create as ReturnType<typeof vi.fn>
    expect(create).toHaveBeenCalledTimes(1)

    const [params, options] = create.mock.calls[0]
    expect(params.mode).toBe('payment')
    expect(params.currency).toBe('usd')
    expect(params.customer_email).toBe('jane@example.com')
    expect(params.client_reference_id).toBe('SB-ABCDEFGHJK')
    // Trusted app URLs — never built from request headers.
    expect(params.success_url).toBe(
      'https://hackthon-2-sayyed-maroof.vercel.app/checkout/success?session_id={CHECKOUT_SESSION_ID}',
    )
    expect(params.cancel_url).toBe('https://hackthon-2-sayyed-maroof.vercel.app/checkout?canceled=1')
    expect(params.metadata).toEqual({
      orderId: 'order_uuid',
      orderRef: 'SB-ABCDEFGHJK',
      shipping_line1: '123 Main Street',
      shipping_city: 'New York',
      shipping_state: 'NY',
      shipping_postal_code: '10001',
      shipping_country: 'United States',
    })
    expect(params.payment_intent_data?.metadata).toEqual({
      orderId: 'order_uuid',
      orderRef: 'SB-ABCDEFGHJK',
    })
    // No secrets or catalog dumps in metadata.
    expect(JSON.stringify(params.metadata)).not.toMatch(/noteIds|sk_|whsec_|password/i)
    expect(options).toEqual({ idempotencyKey: 'checkout:order_uuid:g0' })

    const [lineItem] = params.line_items
    expect(lineItem.price_data.unit_amount).toBe(8_430)
    expect(lineItem.quantity).toBe(2)
  })

  it('uses a distinct idempotency key generation for a new session', async () => {
    const stripe = makeStripe()
    const result = await createCheckoutSessionForOrder({
      stripe,
      orderId: 'order_uuid',
      reference: 'SB-ABCDEFGHJK',
      customerEmail: 'jane@example.com',
      shippingAddress: {
        line1: '123 Main Street',
        line2: '',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
      },
      computed,
      generation: 2,
    })
    expect(result.idempotencyKey).toBe('checkout:order_uuid:g2')

    const create = (stripe as { checkout: { sessions: { create: ReturnType<typeof vi.fn> } } }).checkout.sessions
      .create as ReturnType<typeof vi.fn>
    expect(create.mock.calls[0][1]).toEqual({ idempotencyKey: 'checkout:order_uuid:g2' })
  })
})
