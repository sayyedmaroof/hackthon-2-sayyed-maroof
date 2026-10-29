import type Stripe from 'stripe'
import type { Database } from '@/db'
import type { OrderStatus } from '@/db/schema'
import { cartItems, orders, stripeWebhookEvents } from '@/db/schema'
import { and, eq, inArray } from 'drizzle-orm'

/**
 * Stripe webhook event processing.
 *
 * The processing logic is decoupled from Drizzle through `StripeEventStore`
 * (transaction + row operations) so the state machine can be unit-tested with
 * an in-memory store. `createDrizzleStripeEventStore` is the production glue.
 *
 * Invariants enforced by the processor:
 * - Every event ID is recorded exactly once; the event-claim insert and the
 *   order transition share one transaction.
 * - Retryable failures THROW inside the transaction → the claim rolls back →
 *   the endpoint answers non-2xx so Stripe redelivers.
 * - Transitions are conditional: delayed/out-of-order events can never
 *   downgrade a paid order or resurrect an expired one.
 * - Synthetic events with no matching ScentBuild order are ignored.
 * - On first payment, only the purchased cart entries recorded at checkout
 *   are removed (and only for authenticated users).
 */

export type StripeEvent =
  | Stripe.Event
  | { id: string; type: string; data?: { object?: unknown } }

export type ProcessEventResult =
  | { outcome: 'processed' | 'duplicate' | 'ignored' }
  | { outcome: 'retryable'; reason: string }

export interface StripeEventTx {
  /** True when this event (id) has not been seen yet. */
  claimEvent(event: { id: string; type: string }): Promise<boolean>
  findOrder(orderId: string, sessionId: string): Promise<typeof orders.$inferSelect | null>
  /**
   * Transition to paid. Returns true when the transition actually happened
   * (idempotent no-op for already-paid orders).
   */
  markPaid(order: typeof orders.$inferSelect, paymentIntentId: string | null): Promise<boolean>
  markPaymentFailed(order: typeof orders.$inferSelect): Promise<void>
  markExpired(order: typeof orders.$inferSelect): Promise<void>
  /** Deletes the purchased cart entries (no-op for guests). */
  clearPurchasedCartItems(
    userId: string,
    itemIds: string[],
  ): Promise<void>
}

export interface StripeEventStore {
  withTransaction<T>(fn: (tx: StripeEventTx) => Promise<T>): Promise<T>
}

class RetryableProcessingError extends Error {}

type SessionObject = {
  id?: unknown
  payment_status?: unknown
  metadata?: unknown
  payment_intent?: unknown
}

const PROCESSABLE_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
])

// Statuses from which a "paid" transition is meaningful. A paid event landing
// on an already-paid order is an idempotent no-op; paid always wins.
const PAID_EVER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'payment_failed',
  'expired',
  'checkout_creation_failed',
]

function readSession(eventObject: unknown): SessionObject | null {
  if (typeof eventObject !== 'object' || eventObject === null) return null
  return eventObject as SessionObject
}

function readMetadata(session: SessionObject): Record<string, string> | null {
  const meta = session.metadata
  if (typeof meta !== 'object' || meta === null) return null
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    if (typeof value === 'string') out[key] = value
  }
  return out
}

export function createWebhookProcessor(store: StripeEventStore) {
  return async function processStripeEvent(event: StripeEvent): Promise<ProcessEventResult> {
    if (!PROCESSABLE_EVENTS.has(event.type)) {
      return { outcome: 'ignored' }
    }

    const session = readSession(event.data?.object)
    if (!session || typeof session.id !== 'string' || session.id.length === 0) {
      return { outcome: 'ignored' }
    }

    // Correlate via our own metadata written at session creation. The order ID
    // is a server-generated value — never chosen by the browser.
    const metadata = readMetadata(session)
    const orderId = metadata?.orderId
    if (typeof orderId !== 'string' || orderId.length === 0) {
      // Synthetic/foreign event (e.g. `stripe trigger` without our metadata):
      // acknowledge it without changing any order.
      return { outcome: 'ignored' }
    }

    try {
      return await store.withTransaction(async (tx) => {
        // 1. Claim the event exactly once (PK-based dedup + rollback on
        //    retryable failure = the claim disappears with the transaction).
        const claimed = await tx.claimEvent({ id: event.id, type: event.type })
        if (!claimed) {
          return { outcome: 'duplicate' as const }
        }

        // 2. Load the pending order. A stale metadata embed (race with
        //    checkout persistence) falls back to the checkout session id.
        const order = await tx.findOrder(orderId, session.id as string)
        if (!order) {
          throw new RetryableProcessingError('order not found')
        }

        // 3. Conditional transition.
        const becamePaid = await applyTransition(tx, event.type, session, order)

        // 4. On first payment, clear ONLY purchased cart entries recorded at
        //    checkout. Items added afterwards or belonging to others stay.
        if (becamePaid && order.userId) {
          const lineItemIds = order.lines
            .map((line) => line.cartItemId)
            .filter((id): id is string => Boolean(id))
          if (lineItemIds.length > 0) {
            await tx.clearPurchasedCartItems(order.userId, lineItemIds)
          }
        }

        return { outcome: 'processed' as const }
      })
    } catch (error) {
      if (error instanceof RetryableProcessingError) {
        return { outcome: 'retryable', reason: error.message }
      }
      // Real DB failure: the transaction (including the event claim) rolled
      // back, so Stripe's retry starts clean.
      return {
        outcome: 'retryable',
        reason: error instanceof Error ? error.message : 'unknown database error',
      }
    }
  }
}

async function applyTransition(
  tx: StripeEventTx,
  eventType: string,
  session: SessionObject,
  order: typeof orders.$inferSelect,
): Promise<boolean> {
  const paymentIntentId = readPaymentIntentId(session)
  switch (eventType) {
    case 'checkout.session.completed': {
      // Only confirmed payment may mark the order paid. Sessions that
      // complete unpaid keep pending state for the async events to follow.
      if (session.payment_status === 'paid') {
        return tx.markPaid(order, paymentIntentId)
      }
      return false
    }
    case 'checkout.session.async_payment_succeeded': {
      return tx.markPaid(order, paymentIntentId)
    }
    case 'checkout.session.async_payment_failed': {
      // Attempts are guarded to pending — a confirmed paid state can never
      // become payment_failed.
      await tx.markPaymentFailed(order)
      return false
    }
    case 'checkout.session.expired': {
      await tx.markExpired(order)
      return false
    }
    default:
      return false
  }
}

function readPaymentIntentId(session: SessionObject): string | null {
  const pi = session.payment_intent
  return typeof pi === 'string' && pi.length > 0 ? pi : null
}

// ─── Production store (Drizzle glue) ─────────────────────────────────────────

export function createDrizzleStripeEventStore(db: Database): StripeEventStore {
  return {
    withTransaction<T>(fn: (tx: StripeEventTx) => Promise<T>): Promise<T> {
      return db.transaction(async (dtx) => fn(makeTx(dtx)))
    },
  }
}

function makeTx(dtx: Parameters<Parameters<Database['transaction']>[0]>[0]): StripeEventTx {
  return {
    claimEvent: async (event) => {
      const inserted = await dtx
        .insert(stripeWebhookEvents)
        .values({ eventId: event.id, eventType: event.type })
        .onConflictDoNothing({ target: stripeWebhookEvents.eventId })
        .returning({ eventId: stripeWebhookEvents.eventId })
      return inserted.length > 0
    },

    findOrder: async (orderId, sessionId) => {
      let rows = await dtx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
      if (rows.length === 0) {
        rows = await dtx
          .select()
          .from(orders)
          .where(eq(orders.stripeSessionId, sessionId))
          .limit(1)
      }
      return rows[0] ?? null
    },

    markPaid: async (order, paymentIntentId) => {
      const rows = await dtx
        .update(orders)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
          ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
        })
        .where(and(eq(orders.id, order.id), inArray(orders.status, [...PAID_EVER_STATUSES])))
        .returning({ id: orders.id, status: orders.status })

      if (rows.length > 0) return rows[0].status === 'paid'
      // No rows changed: either already paid (idempotent no-op) or the order
      // vanished between select and update. Only real paid state counts.
      const current = await dtx.select().from(orders).where(eq(orders.id, order.id)).limit(1)
      return Boolean(current[0] && current[0].status === 'paid')
    },

    markPaymentFailed: async (order) => {
      await dtx
        .update(orders)
        .set({ status: 'payment_failed', updatedAt: new Date() })
        .where(and(eq(orders.id, order.id), eq(orders.status, 'pending')))
        .returning({ id: orders.id })
    },

    markExpired: async (order) => {
      await dtx
        .update(orders)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(
          and(
            eq(orders.id, order.id),
            inArray(orders.status, ['pending', 'checkout_creation_failed']),
          ),
        )
        .returning({ id: orders.id })
    },

    clearPurchasedCartItems: async (userId, itemIds) => {
      if (itemIds.length === 0) return
      await dtx
        .delete(cartItems)
        .where(and(eq(cartItems.userId, userId), inArray(cartItems.itemId, itemIds)))
    },
  }
}
