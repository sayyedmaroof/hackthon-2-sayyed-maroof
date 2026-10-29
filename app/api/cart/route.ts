import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { cartItems } from '@/db/schema'
import { getAuthUser } from '@/lib/auth'
import { parseCartItem } from '@/lib/storage'
import type { CartItem } from '@/lib/types'

const MAX_ITEMS = 20

function unauthorized() {
  return NextResponse.json({ error: 'Sign in to sync your cart.' }, { status: 401 })
}

function rowToItem(row: { itemId: string; blend: unknown; quantity: number }): CartItem | null {
  // Stored JSONB was validated on write, but re-parse defensively.
  const item = parseCartItem({ id: row.itemId, blend: row.blend, quantity: row.quantity })
  return item
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const rows = await db
    .select({ itemId: cartItems.itemId, blend: cartItems.blend, quantity: cartItems.quantity })
    .from(cartItems)
    .where(eq(cartItems.userId, user.id))

  const items = rows.map(rowToItem).filter((i): i is CartItem => i !== null)
  return NextResponse.json({ items })
}

/** Full-sync: replaces the signed-in user's cart with the posted list. */
export async function PUT(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rawItems = Array.isArray((body as { items?: unknown[] })?.items)
    ? (body as { items: unknown[] }).items
    : []
  if (rawItems.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Cart is limited to ${MAX_ITEMS} blends.` }, { status: 400 })
  }

  const items = rawItems
    .map((item) => parseCartItem(item))
    .filter((i): i is CartItem => i !== null)
    // Duplicate ids in the payload (e.g. raced syncs) would violate the
    // (user_id, item_id) primary key; keep the first occurrence.
    .filter((item, index, all) => all.findIndex((i) => i.id === item.id) === index)

  await db.transaction(async (tx) => {
    await tx.delete(cartItems).where(eq(cartItems.userId, user.id))
    if (items.length > 0) {
      await tx.insert(cartItems).values(
        items.map((item) => ({
          userId: user.id,
          itemId: item.id,
          blend: item.blend,
          quantity: item.quantity,
        })),
      )
    }
  })

  return NextResponse.json({ ok: true, count: items.length })
}
