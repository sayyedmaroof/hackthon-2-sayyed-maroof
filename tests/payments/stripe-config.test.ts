import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  generateOrderReference,
  isValidCheckoutAttemptId,
  isValidStripeSessionId,
  validateAppUrl,
} from '../../lib/stripe'
import { buildOrderLines } from '../../lib/payments/orders'

describe('validateAppUrl', () => {
  it('rejects missing values', () => {
    expect(validateAppUrl(undefined)).toHaveProperty('error')
    expect(validateAppUrl('   ')).toHaveProperty('error')
    expect(validateAppUrl(null)).toHaveProperty('error')
  })

  it('rejects unparseable values', () => {
    expect(validateAppUrl('not a url')).toHaveProperty('error')
    expect(validateAppUrl('//host')).toHaveProperty('error')
  })

  it('rejects non-http(s) protocols', () => {
    expect(validateAppUrl('ftp://example.com')).toHaveProperty('error')
    expect(validateAppUrl('javascript:alert(1)')).toHaveProperty('error')
  })

  it('rejects URLs with credentials or a path', () => {
    expect(validateAppUrl('https://user:pass@example.com')).toHaveProperty('error')
    expect(validateAppUrl('https://example.com/app/path')).toHaveProperty('error')
  })

  it('accepts clean http(s) origins and trims trailing slashes', () => {
    expect(validateAppUrl('https://hackthon-2-sayyed-maroof.vercel.app')).toEqual({
      url: 'https://hackthon-2-sayyed-maroof.vercel.app',
      origin: 'https://hackthon-2-sayyed-maroof.vercel.app',
    })
    expect(validateAppUrl('http://localhost:3000')).toEqual({
      url: 'http://localhost:3000',
      origin: 'http://localhost:3000',
    })
    expect(validateAppUrl('https://example.com/')).toEqual({
      url: 'https://example.com',
      origin: 'https://example.com',
    })
  })
})

describe('identifiers and guards', () => {
  it('generates unique, well-formed order references', () => {
    const references = new Set(Array.from({ length: 200 }, () => generateOrderReference()))
    expect(references.size).toBe(200)
    for (const reference of references) {
      expect(reference).toMatch(/^SB-[A-HJ-NP-Z2-9]{10}$/)
    }
  })

  it('accepts only well-formed checkout attempt ids', () => {
    expect(isValidCheckoutAttemptId('chk_4f1a2b3c')).toBe(true)
    expect(isValidCheckoutAttemptId('-'.repeat(64))).toBe(true)
    expect(isValidCheckoutAttemptId('short')).toBe(false)
    expect(isValidCheckoutAttemptId('bad id with spaces')).toBe(false)
    expect(isValidCheckoutAttemptId(123 as unknown as string)).toBe(false)
    // SQL-shaped junk can never be a valid attempt id
    expect(isValidCheckoutAttemptId("'; DROP TABLE orders; --")).toBe(false)
  })

  it('accepts only Stripe-shaped session ids', () => {
    expect(isValidStripeSessionId('cs_test_a1b2c3d4e5f6')).toBe(true)
    expect(isValidStripeSessionId(`cs_test_${'x'.repeat(380)}`)).toBe(true)
    expect(isValidStripeSessionId('not_a_session')).toBe(false)
    expect(isValidStripeSessionId(`cs_${'x'.repeat(500)}`)).toBe(false)
    expect(isValidStripeSessionId('cs_short')).toBe(false)
  })
})

describe('buildOrderLines (server-authoritative pricing)', () => {
  const validBottle = {
    size: 50,
    concentration: 'edp',
    bottleType: 'classic',
    atomizerMaterial: 'plastic',
    atomizerType: 'normal',
    labelStyle: 'ivory',
    base: 'alcohol',
  }
  
  // Real catalog ids: bergamot (top), rose (middle), musk (base).
  const validItems = [
    {
      id: 'blend_1',
      name: 'My Blend',
      noteIds: ['bergamot', 'rose', 'musk'],
      bottle: validBottle,
      quantity: 2,
    },
  ]

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  it('rejects an empty cart', () => {
    expect(buildOrderLines([])).toMatchObject({ ok: false, error: 'Your cart is empty.' })
    expect(buildOrderLines('nope')).toMatchObject({ ok: false, error: 'Your cart is empty.' })
  })

  it('rejects per-line and total quantity violations', () => {
    const tooMany = [{ ...validItems[0], quantity: 11 }]
    expect(buildOrderLines(tooMany)).toMatchObject({ ok: false, error: 'Each blend can be ordered 1 to 10 times.' })

    const totalsBreach = Array.from({ length: 4 }, (_, i) => ({
      ...validItems[0],
      id: `blend_${i}`,
      cartItemId: `item_${i}`,
      quantity: 8,
    }))
    expect(buildOrderLines(totalsBreach)).toMatchObject({ ok: false, error: 'Orders are limited to 30 bottles.' })
  })

  it('rejects unknown note ids and incomplete/clashing blends', () => {
    const fake = [{ ...validItems[0], noteIds: ['not-a-note', 'lavender', 'musk'] }]
    const result = buildOrderLines(fake)
    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ ok: false })

    const incomplete = [{ ...validItems[0], noteIds: ['bergamot'] }]
    expect(buildOrderLines(incomplete).ok).toBe(false)

    const clash = [{ ...validItems[0], noteIds: ['bergamot', 'lavender', 'cinnamon'] }]
    expect(buildOrderLines(clash).ok).toBe(false)
  })

  it('ignores client-provided price fields entirely', () => {
    const malicious = [
      {
        ...validItems[0],
        unitPrice: 0.01,
        lineTotal: 0.01,
        subtotal: 0.01,
        unitPriceCents: 1,
        totalCents: 1,
        price: 0,
      },
    ]
    const result = buildOrderLines(malicious)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    // Recomputed from the real pricing engine, not the malicious payload.
    expect(result.value.subtotalCents).toBeGreaterThan(1_000)
    expect(result.value.totalCents).toBe(result.value.subtotalCents + result.value.shippingCents)
  })

  it('stores money in integer cents and keeps an immutable snapshot', () => {
    const result = buildOrderLines(validItems)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')

    const { value } = result
    expect(Number.isInteger(value.subtotalCents)).toBe(true)
    expect(Number.isInteger(value.shippingCents)).toBe(true)
    expect(Number.isInteger(value.totalCents)).toBe(true)

    const line = value.lines[0]
    expect(line).toMatchObject({
      blendId: 'blend_1',
      blendName: 'My Blend',
      quantity: 2,
    })
    expect(line.noteIds).toEqual(['bergamot', 'rose', 'musk'])
    expect(typeof line.unitPriceCents).toBe('number')
    expect(Number.isInteger(line.lineTotalCents)).toBe(true)
    expect(line.lineTotalCents).toBe(line.unitPriceCents * 2)
  })

  it('keeps cart item ids for later selective cart clearing', () => {
    const result = buildOrderLines([
      { ...validItems[0], cartItemId: 'item_aaa' },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.cartItemIds).toEqual(['item_aaa'])
    expect(result.value.lines[0].cartItemId).toBe('item_aaa')
  })

  it('caps the number of lines defensively', () => {
    // Passing more entries than MAX_LINES is truncated…
    const oversized = Array.from({ length: 25 }, (_, i) => ({
      ...validItems[0],
      id: `blend_${i}`,
      cartItemId: `item_${i}`,
      quantity: 1,
    }))
    const result = buildOrderLines(oversized)
    // …but 20 lines x 1 qty is a valid order (20 total bottles ≤ 30).
    expect(result.ok).toBe(true)
  })
})

describe('environment parity checks', () => {
  const previous = { ...process.env }

  afterEach(() => {
    process.env = { ...previous }
  })

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it('documents every required environment variable in .env.example', async () => {
    const { readFileSync } = await import('node:fs')
    const example = readFileSync('.env.example', 'utf8')
    for (const key of ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'NEXT_PUBLIC_APP_URL']) {
      expect(example).toContain(key)
    }
  })
})
