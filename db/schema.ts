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

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  savedBlends: many(savedBlends),
  cartItems: many(cartItems),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))
