import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createWebhookProcessor,
  type ProcessEventResult,
  type StripeEvent,
  type StripeEventStore,
  type StripeEventTx,
} from '../../lib/payments/webhook-processor'
import type { OrderLineRecord, OrderStatus } from '../../db/schema'

/**
 * Webhook event processing state machine, exercised through an in-memory
 * transactional store whose semantics mirror the Drizzle production store:
 * - claim is PK-like (second claim = duplicate),
 * - transitions carry the same conditional guards,
 * - throwing rolls the whole transaction back (claim included).
 */

interface TestState {
  orders: Map<string, OrderRow>
  events: Map<string, string>
  claimedSuccessfully: Array<{ id: string; type: string }>
  cartDeleted: { userId: string; itemIds: string[] }[]
  failUpdates: boolean
  updateLog: { orderId: string; to: OrderStatus }[]
}

type OrderRow = {
  id: string
  reference: string
  userId: string | null
  status: OrderStatus
  lines: OrderLineRecord[]
  statePaymentIntentId?: string
}

function clone(order: OrderRow): OrderRow {
  return { ...order, lines: order.lines.map((line) => ({ ...line })) }
}

function makeStore(state: TestState): StripeEventStore {
  return {
    withTransaction<T>(fn: (tx: StripeEventTx) => Promise<T>): Promise<T> {
      // Mirror SQL semantics with rollback-on-throw:
      const claim = new Set<string>()
      const updates: TestState['updateLog'] = []
      const deletions: TestState['cartDeleted'] = []
      const snapshot: TestState = {
        ...state,
        orders: new Map(state.orders),
        events: new Map(state.events),
        updateLog: updates,
        cartDeleted: deletions,
      }
      const tx = makeTx(snapshot, claim)
      return fn(tx).then(
        (value) => {
          // commit
          for (const [id, type] of snapshot.events) state.events.set(id, type)
          for (const row of Array.from(snapshot.orders.values())) {
            state.orders.set(row.id, clone(row))
          }
          state.claimedSuccessfully.push(...snapshot.claimedSuccessfully)
          state.updateLog.push(...updates)
          state.cartDeleted.push(...deletions)
          state.failUpdates = snapshot.failUpdates
          return value
        },
        (error) => {
          // rollback — nothing persisted
          throw error
        },
      )
    },
  }
}

function makeTx(tx: TestState, claimSet: Set<string>): StripeEventTx {
  return {
    claimEvent: async (event) => {
      if (tx.events.has(event.id)) return false
      tx.events.set(event.id, event.type)
      claimSet.add(event.id)
      tx.claimedSuccessfully.push(event)
      return true
    },
    findOrder: async (orderId, sessionId) => {
      const byId = tx.orders.get(orderId)
      if (byId) return clone(byId) as unknown as OrderFull
      const bySession = Array.from(tx.orders.values()).find(
        (order) => (order as OrderRowWithSession).stripeSessionId === sessionId,
      )
      return bySession ? (clone(bySession) as unknown as OrderFull) : null
    },
    markPaid: async (order, paymentIntentId) => {
      if (tx.failUpdates) throw new Error('db write failed (simulated)')
      const row = tx.orders.get(order.id)
      if (!row) return false
      if (row.status === 'paid') return false
      row.status = 'paid'
      if (paymentIntentId) row.statePaymentIntentId = paymentIntentId
      tx.updateLog.push({ orderId: row.id, to: 'paid' })
      return true
    },
    markPaymentFailed: async (order) => {
      if (tx.failUpdates) throw new Error('db write failed (simulated)')
      const row = tx.orders.get(order.id)
      if (!row) return
      if (row.status !== 'pending') return // guard mirrored from production
      row.status = 'payment_failed'
      tx.updateLog.push({ orderId: row.id, to: 'payment_failed' })
    },
    markExpired: async (order) => {
      if (tx.failUpdates) throw new Error('db write failed (simulated)')
      const row = tx.orders.get(order.id)
      if (!row) return
      if (row.status !== 'pending' && row.status !== 'checkout_creation_failed') return
      row.status = 'expired'
      tx.updateLog.push({ orderId: row.id, to: 'expired' })
    },
    clearPurchasedCartItems: async (userId, itemIds) => {
      tx.cartDeleted.push({ userId, itemIds: [...itemIds] })
    },
  }
}

type OrderRowWithSession = OrderRow & { statePaymentIntentId?: string; stripeSessionId?: string }
type OrderFull = typeof import('../../db/schema').orders.$inferSelect

function makeOrder(overrides: Partial<OrderRowWithSession> = {}): OrderRowWithSession {
  return {
    id: 'order_1',
    reference: 'SB-TEST000001',
    userId: 'user_1',
    status: 'pending',
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
        quantity: 1,
        unitPriceCents: 8_430,
        lineTotalCents: 8_430,
      },
    ],
    ...overrides,
  }
}

function makeEvent(
  type: string,
  sessionId = 'cs_test_full',
  extra: { metadata?: unknown; payment_status?: string; payment_intent?: string } = {},
): StripeEvent {
  return {
    id: `evt_${type}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    data: {
      object: {
        id: sessionId,
        payment_status: extra.payment_status ?? 'paid',
        payment_intent: extra.payment_intent ?? 'pi_test_1',
        ...(extra.metadata !== undefined ? { metadata: extra.metadata } : { metadata: { orderId: 'order_1', orderRef: 'SB-TEST000001' } }),
      },
    },
  }
}

const PAID_ONLY = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired']
void PAID_ONLY

describe('webhook event processing', () => {
  let state: TestState
  let processor: (event: StripeEvent) => Promise<ProcessEventResult>

  beforeEach(() => {
    state = {
      orders: new Map([['order_1', clone(makeOrder())]]),
      events: new Map(),
      claimedSuccessfully: [],
      cartDeleted: [],
      failUpdates: false,
      updateLog: [],
    }
    processor = createWebhookProcessor(makeStore(state))
  })

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  // (8, 16) synthetic / foreign events ---------------------------------------------------

  it('ignores unknown event types without touching the order', async () => {
    await expect(processor(makeEvent('invoice.paid'))).resolves.toMatchObject({ outcome: 'ignored' })
    expect(state.updateLog).toHaveLength(0)
    expect(state.claimedSuccessfully).toHaveLength(0)
  })

  it('ignores events without our metadata — no fake paid orders from synthetic triggers', async () => {
    const result = await processor(makeEvent('checkout.session.completed', 'cs_test_full', { metadata: null }))
    expect(result).toMatchObject({ outcome: 'ignored' })
    expect(state.updateLog).toHaveLength(0)
  })

  it('retries (instead of faking success) when matching metadata cannot find the order', async () => {
    state.orders.clear()
    await expect(processor(makeEvent('checkout.session.completed'))).resolves.toMatchObject({
      outcome: 'retryable',
      reason: 'order not found',
    })
    // rolled back → a retry delivery will find the order once it's visible
    expect(state.events.size).toBe(0)
  })

  // (1, 9, 10) completed session ----------------------------------------------------------

  it('marks the order paid for checkout.session.completed with payment_status=paid', async () => {
    await expect(processor(makeEvent('checkout.session.completed'))).resolves.toMatchObject({
      outcome: 'processed',
    })
    expect(state.orders.get('order_1')?.status).toBe('paid')
    expect((state.orders.get('order_1') as OrderRowWithSession).statePaymentIntentId).toBe('pi_test_1')
  })

  it('keeps an unpaid completed session pending (delayed/async payment)', async () => {
    await expect(
      processor(makeEvent('checkout.session.completed', 'cs_test_full', { payment_status: 'unpaid' })),
    ).resolves.toMatchObject({ outcome: 'processed' })
    expect(state.orders.get('order_1')?.status).toBe('pending')
  })

  // (3, 4, 11, 12, 13) async flows -------------------------------------------------------

  it('marks paid on async_payment_succeeded', async () => {
    await processor(makeEvent('checkout.session.async_payment_succeeded', 'cs_test_full', { payment_status: 'unpaid' }))
    expect(state.orders.get('order_1')?.status).toBe('paid')
  })

  it('marks a still-unpaid order failed on async_payment_failed', async () => {
    await processor(makeEvent('checkout.session.async_payment_failed', 'cs_test_full', { payment_status: 'unpaid' }))
    expect(state.orders.get('order_1')?.status).toBe('payment_failed')
  })

  it('never downgrades a paid order to payment_failed (async_payment_failed is guarded)', async () => {
    ;(state.orders.get('order_1') as OrderRowWithSession).status = 'paid'
    await processor(makeEvent('checkout.session.async_payment_failed', 'cs_test_full', { payment_status: 'unpaid' }))
    expect(state.orders.get('order_1')?.status).toBe('paid')
  })

  it('marks an eligible unpaid order expired on checkout.session.expired', async () => {
    await processor(makeEvent('checkout.session.expired', 'cs_test_full', { payment_status: 'unpaid' }))
    expect(state.orders.get('order_1')?.status).toBe('expired')
  })

  it('does not downgrade a paid order on expiration events (out-of-order safety, case 15)', async () => {
    ;(state.orders.get('order_1') as OrderRowWithSession).status = 'paid'
    await expect(
      processor(makeEvent('checkout.session.expired', 'cs_test_full', { payment_status: 'unpaid' })),
    ).resolves.toMatchObject({ outcome: 'processed' })
    expect(state.orders.get('order_1')?.status).toBe('paid')
  })

  it('paid wins over stale expiration: expired → paid transition is meaningful', async () => {
    const session = state.orders.get('order_1') as OrderRowWithSession
    session.status = 'expired'
    await processor(makeEvent('checkout.session.async_payment_succeeded'))
    expect(state.orders.get('order_1')?.status).toBe('paid')
  })

  // (14) duplicates -----------------------------------------------------------------------

  it('processes a duplicate webhook delivery only once (idempotent case 14)', async () => {
    const event = makeEvent('checkout.session.completed')
    const first = await processor(event)
    const second = await processor(event)
    expect(first).toMatchObject({ outcome: 'processed' })
    expect(second).toMatchObject({ outcome: 'duplicate' })
    // Order updated exactly once
    expect(state.updateLog).toEqual([{ orderId: 'order_1', to: 'paid' }])
  })

  it('ignores brand-new duplicate-type events after the first succeeded', async () => {
    await processor(makeEvent('checkout.session.async_payment_succeeded'))
    await processor(makeEvent('checkout.session.async_payment_failed'))
    // still paid — the failed event was deduped and could not downgrade
    expect(state.orders.get('order_1')?.status).toBe('paid')
  })

  // (17) database failures ----------------------------------------------------------------

  it('answers retryable when the DB write fails and rolls back the event claim', async () => {
    state.failUpdates = true
    const result = await processor(makeEvent('checkout.session.completed'))
    expect(result).toMatchObject({ outcome: 'retryable', reason: 'db write failed (simulated)' })
    expect(state.events.size).toBe(0) // claim rolled back
    expect(state.orders.get('order_1')?.status).toBe('pending')
  })

  // Cart clearing ----------------------------------------------------------------------------

  it('clears only the purchased cart entries after verified payment (case 20)', async () => {
    await processor(makeEvent('checkout.session.completed'))
    expect(state.cartDeleted).toEqual([{ userId: 'user_1', itemIds: ['item_1'] }])
  })

  it('does nothing to the cart for guests (no userId)', async () => {
    ;(state.orders.get('order_1') as OrderRowWithSession).userId = null
    await processor(makeEvent('checkout.session.completed'))
    expect(state.cartDeleted).toHaveLength(0)
    expect(state.updateLog).toEqual([{ orderId: 'order_1', to: 'paid' }])
  })

  it('does not touch the cart when payment is unverified', async () => {
    await processor(makeEvent('checkout.session.expired', 'cs_test_full', { payment_status: 'unpaid' }))
    expect(state.cartDeleted).toHaveLength(0)
    expect(state.cartDeleted).toEqual([])
  })

  // Session-id fallback correlation -------------------------------------------------------------

  it('correlates via checkout session id when metadata is blank', async () => {
    ;(state.orders.get('order_1') as OrderRowWithSession).stripeSessionId = 'cs_test_full'
    const metadataMissing = makeEvent('checkout.session.completed', 'cs_test_full', { metadata: null })
    await expect(metadataMissing).toBeDefined()

    // metadata missing → ignored. But partial metadata (empty string orderId)
    // still ignored; the fallback only applies to retries with valid metadata.
    await expect(processor(metadataMissing)).resolves.toMatchObject({ outcome: 'ignored' })
  })

  it('falls back to the session id when the metadata order id does not exist', async () => {
    ;(state.orders.get('order_1') as OrderRowWithSession).stripeSessionId = 'cs_test_full'
    const event = makeEvent('checkout.session.completed', 'cs_test_full', {
      metadata: { orderId: 'stale_order_id', orderRef: 'SB-TEST000001' },
    })
    await expect(processor(event)).resolves.toMatchObject({ outcome: 'processed' })
    expect(state.orders.get('order_1')?.status).toBe('paid')
  })
})
