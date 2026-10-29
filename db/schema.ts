import { relations } from 'drizzle-orm'
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/**
 * Blends (draft snapshots) are the app's own domain shape — see lib/types.ts.
 * They are stored as JSONB so the builder can evolve without a migration
 * for every bottle option or note tweak.
 */
export interface BlendRecord {
  id: string
  name: string
  noteIds: string[]
  bottle: {
    size: number
    concentration: string
    bottleType: string
    atomizerMaterial: string
    atomizerType: string
    labelStyle: string
  }
  presetId?: string
  updatedAt: number
}

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
)

export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

export const savedBlends = pgTable(
  'saved_blends',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blendId: text('blend_id').notNull(),
    blend: jsonb('blend').$type<BlendRecord>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.blendId] }),
    index('saved_blends_user_idx').on(table.userId),
  ],
)

export const cartItems = pgTable(
  'cart_items',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull(),
    blend: jsonb('blend').$type<BlendRecord>().notNull(),
    quantity: integer('quantity').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.itemId] }),
    index('cart_items_user_idx').on(table.userId),
  ],
)

/**
 * Money is persisted in integer cents; conversion to display values happens
 * only at the API/UI boundary. `lines` is an immutable snapshot of the
 * purchased blends (including note IDs + bottle options) so historical orders
 * keep rendering the same way even if the catalog or prices change later.
 */
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'payment_failed'
  | 'expired'
  | 'checkout_creation_failed'
  | 'refunded'

export interface OrderLineRecord {
  blendId: string
  blendName: string
  noteIds: string[]
  bottle: {
    size: number
    concentration: string
    bottleType: string
    atomizerMaterial: string
    atomizerType: string
    labelStyle: string
    base: string
  }
  /**
   * Cart item ID at checkout time ("" for guest carts without ids). Stored so
   * a fully paid order can clear exactly the purchased cart entries — and
   * nothing added to the cart afterwards.
   */
  cartItemId?: string
  quantity: number
  /** Unit price and line total in USD cents. */
  unitPriceCents: number
  lineTotalCents: number
}

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    reference: text('reference').notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    lines: jsonb('lines').$type<OrderLineRecord[]>().notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    shippingCents: integer('shipping_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    currency: text('currency').notNull().default('usd'),
    status: text('status').$type<OrderStatus>().notNull().default('pending'),
    cartIdempotencyKey: text('cart_idempotency_key').notNull(),
    /** How many Checkout Sessions have been created for this order. */
    checkoutGenerations: integer('checkout_generations').notNull().default(0),
    stripeSessionId: text('stripe_session_id'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('orders_reference_unique').on(table.reference),
    uniqueIndex('orders_stripe_session_unique').on(table.stripeSessionId),
    uniqueIndex('orders_cart_attempt_unique').on(table.cartIdempotencyKey),
    index('orders_user_created_idx').on(table.userId, table.createdAt),
    index('orders_stripe_session_idx').on(table.stripeSessionId),
  ],
)

/**
 * Webhook deduplication: Stripe retries deliveries, so each Stripe event ID is
 * recorded exactly once. Event processing and the order state transition run
 * in one transaction — an event is only marked processed when its order update
 * committed.
 */
export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  eventId: text('event_id').primaryKey(),
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
})

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  savedBlends: many(savedBlends),
  cartItems: many(cartItems),
  orders: many(orders),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))
