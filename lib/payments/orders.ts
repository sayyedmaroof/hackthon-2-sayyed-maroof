import { calculatePrice, SHIPPING_FLAT } from '@/lib/pricing'
import { parseBottle, sanitizeName } from '@/lib/storage'
import { sanitizeNoteIds, validateBlend } from '@/lib/validation'
import type { OrderLineRecord } from '@/db/schema'
import type { BottleOptions, Blend } from '@/lib/types'

/**
 * Shared checkout validation and persistence helpers.
 * Prices are ALWAYS recalculated here from note IDs + bottle options;
 * anything the browser sends about amounts is ignored.
 */

export const MAX_LINES = 20
export const MAX_QTY_PER_LINE = 10
export const MAX_TOTAL_QTY = 30

export const toCents = (dollars: number) => Math.round(dollars * 100)
export const fromCents = (cents: number) => cents / 100

export interface CheckoutItemInput {
  id?: unknown
  name?: unknown
  noteIds: unknown
  bottle: unknown
  quantity: unknown
  /** Client cart-item identifier, kept only to clear purchased cart entries later. */
  cartItemId?: unknown
}

export interface ComputedOrderLines {
  lines: OrderLineRecord[]
  cartItemIds: string[]
  subtotalCents: number
  shippingCents: number
  totalCents: number
}

export type BuildLinesResult =
  | { ok: true; value: ComputedOrderLines }
  | { ok: false; error: string }

/**
 * Validates the raw cart payload and computes authoritative order lines:
 * note-ID sanitisation, blend compatibility, bottle parsing and pricing all
 * use the same engine the storefront displays with.
 */
export function buildOrderLines(rawItems: unknown): BuildLinesResult {
  const items = Array.isArray(rawItems) ? rawItems.slice(0, MAX_LINES) : []
  if (items.length === 0) {
    return { ok: false, error: 'Your cart is empty.' }
  }

  const lines: OrderLineRecord[] = []
  const cartItemIds: string[] = []
  let lineIndex = 0
  let totalQty = 0

  for (const raw of items) {
    const item = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>

    const quantity =
      typeof item.quantity === 'number' && Number.isInteger(item.quantity)
        ? item.quantity
        : Number.NaN
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      return { ok: false, error: `Each blend can be ordered 1 to ${MAX_QTY_PER_LINE} times.` }
    }
    totalQty += quantity
    if (totalQty > MAX_TOTAL_QTY) {
      return { ok: false, error: `Orders are limited to ${MAX_TOTAL_QTY} bottles.` }
    }

    const noteIds = sanitizeNoteIds(item.noteIds)
    const validation = validateBlend(noteIds)
    if (!validation.valid) {
      return {
        ok: false,
        error:
          'One of your blends is incomplete or contains clashing notes. Please revisit it in the builder.',
      }
    }

    const bottle: BottleOptions = parseBottle(item.bottle)
    const name = sanitizeName(item.name, `Custom Blend ${lineIndex + 1}`)
    const { unitTotal } = calculatePrice(noteIds, bottle)

    const cartItemId =
      typeof item.cartItemId === 'string' && item.cartItemId.length <= 64 ? item.cartItemId : ''

    lines.push({
      blendId: typeof item.id === 'string' ? item.id.slice(0, 64) : `blend_${lineIndex}`,
      blendName: name,
      noteIds,
      bottle: {
        size: bottle.size,
        concentration: bottle.concentration,
        bottleType: bottle.bottleType,
        atomizerMaterial: bottle.atomizerMaterial,
        atomizerType: bottle.atomizerType,
        labelStyle: bottle.labelStyle,
        base: bottle.base,
      },
      cartItemId: cartItemId || undefined,
      quantity,
      unitPriceCents: toCents(unitTotal),
      lineTotalCents: toCents(unitTotal * quantity),
    })
    if (cartItemId) cartItemIds.push(cartItemId)
    lineIndex += 1
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0)
  const shippingCents = toCents(SHIPPING_FLAT)

  return {
    ok: true,
    value: {
      lines,
      cartItemIds,
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents + shippingCents,
    },
  }
}

/** Convex, display-safe summary of a stored order (for the success page). */
export function orderSummaryLines(lines: OrderLineRecord[]) {
  return lines.map((line) => ({
    name: line.blendName,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    lineTotalCents: line.lineTotalCents,
  }))
}

/** Reconstructs a Blend object from a stored order line (legacy/preview use). */
export function lineToBlend(line: OrderLineRecord): Blend {
  return {
    id: line.blendId,
    name: line.blendName,
    noteIds: [...line.noteIds],
    bottle: parseBottle(line.bottle),
    updatedAt: 0,
  }
}

export const ORDER_STATUS_VALUES = [
  'pending',
  'paid',
  'payment_failed',
  'expired',
  'checkout_creation_failed',
  'refunded',
] as const
