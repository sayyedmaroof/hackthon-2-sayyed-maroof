import { NextResponse } from 'next/server'
import { calculatePrice, SHIPPING_FLAT } from '@/lib/pricing'
import { parseBottle, sanitizeName } from '@/lib/storage'
import { sanitizeNoteIds, validateBlend } from '@/lib/validation'
import type { Order, OrderLine } from '@/lib/types'

const MAX_LINES = 20
const MAX_QTY_PER_LINE = 10
const MAX_TOTAL_QTY = 30

const round2 = (v: number) => Math.round(v * 100) / 100

/**
 * Demo checkout. Prices are always recomputed here from note IDs and bottle options;
 * any price sent by the client is ignored.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const data = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  const email = typeof data.email === 'string' ? data.email.trim().slice(0, 120) : ''
  const fullName = typeof data.fullName === 'string' ? data.fullName.trim().slice(0, 80) : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (fullName.length < 2) {
    return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 })
  }

  const rawItems = Array.isArray(data.items) ? data.items.slice(0, MAX_LINES) : []
  if (rawItems.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
  }

  const lines: OrderLine[] = []
  let totalQty = 0
  for (const raw of rawItems) {
    const item = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const quantity = item.quantity
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      return NextResponse.json({ error: 'Each blend can be ordered 1 to 10 times.' }, { status: 400 })
    }
    totalQty += quantity

    const noteIds = sanitizeNoteIds(item.noteIds)
    const validation = validateBlend(noteIds)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'One of your blends is incomplete or contains clashing notes. Please revisit it in the builder.' },
        { status: 400 },
      )
    }

    const bottle = parseBottle(item.bottle)
    const { unitTotal } = calculatePrice(noteIds, bottle)
    lines.push({
      blend: {
        id: typeof item.id === 'string' ? item.id.slice(0, 64) : `blend_${lines.length}`,
        name: sanitizeName(item.name),
        noteIds,
        bottle,
        updatedAt: Date.now(),
      },
      quantity,
      unitPrice: unitTotal,
      lineTotal: round2(unitTotal * quantity),
    })
  }

  if (totalQty > MAX_TOTAL_QTY) {
    return NextResponse.json({ error: `Orders are limited to ${MAX_TOTAL_QTY} bottles.` }, { status: 400 })
  }

  const subtotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0))
  const reference = `SB-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`

  const order: Order = {
    id: crypto.randomUUID(),
    reference,
    email,
    fullName,
    lines,
    subtotal,
    shipping: SHIPPING_FLAT,
    total: round2(subtotal + SHIPPING_FLAT),
    createdAt: Date.now(),
    mode: 'demo',
  }

  return NextResponse.json({ order })
}
