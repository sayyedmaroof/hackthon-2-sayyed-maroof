import { DEFAULT_BOTTLE } from './fragrance-data'
import { ATOMIZER_MATERIAL_OPTIONS, ATOMIZER_TYPE_OPTIONS, BOTTLE_TYPE_OPTIONS, CONCENTRATION_OPTIONS, LABEL_OPTIONS, SIZE_OPTIONS } from './pricing'
import { sanitizeNoteIds } from './validation'
import type { Blend, BottleOptions, CartItem, Order, OrderLine } from './types'

const KEYS = {
  draft: 'scentbuild:draft:v1',
  cart: 'scentbuild:cart:v1',
  saved: 'scentbuild:saved:v1',
  orders: 'scentbuild:orders:v1',
} as const

type StorageKey = keyof typeof KEYS

function readRaw(key: StorageKey): unknown {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(KEYS[key])
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

function writeRaw(key: StorageKey, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEYS[key], JSON.stringify(value))
  } catch {
    // Storage can be full or disabled (private mode); the app keeps working in memory.
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function pickOption<T>(value: unknown, options: { value: T }[], fallback: T): T {
  return options.some((o) => o.value === value) ? (value as T) : fallback
}

export function parseBottle(value: unknown): BottleOptions {
  const v = isObject(value) ? value : {}
  return {
    size: pickOption(v.size, SIZE_OPTIONS, DEFAULT_BOTTLE.size),
    concentration: pickOption(v.concentration, CONCENTRATION_OPTIONS, DEFAULT_BOTTLE.concentration),
    bottleType: pickOption(v.bottleType, BOTTLE_TYPE_OPTIONS, DEFAULT_BOTTLE.bottleType),
    atomizerMaterial: pickOption(v.atomizerMaterial, ATOMIZER_MATERIAL_OPTIONS, DEFAULT_BOTTLE.atomizerMaterial),
    atomizerType: pickOption(v.atomizerType, ATOMIZER_TYPE_OPTIONS, DEFAULT_BOTTLE.atomizerType),
    labelStyle: pickOption(v.labelStyle, LABEL_OPTIONS, DEFAULT_BOTTLE.labelStyle),
  }
}

export function sanitizeName(value: unknown, fallback = 'Untitled Blend') {
  if (typeof value !== 'string') return fallback
  const trimmed = value.replace(/\s+/g, ' ').trim().slice(0, 32)
  return trimmed || fallback
}

export function parseBlend(value: unknown): Blend | null {
  if (!isObject(value) || typeof value.id !== 'string') return null
  return {
    id: value.id.slice(0, 64),
    name: sanitizeName(value.name),
    noteIds: sanitizeNoteIds(value.noteIds),
    bottle: parseBottle(value.bottle),
    presetId: typeof value.presetId === 'string' ? value.presetId : undefined,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
  }
}

function parseCartItem(value: unknown): CartItem | null {
  if (!isObject(value) || typeof value.id !== 'string') return null
  const blend = parseBlend(value.blend)
  if (!blend || blend.noteIds.length === 0) return null
  const quantity = typeof value.quantity === 'number' ? Math.min(10, Math.max(1, Math.floor(value.quantity))) : 1
  return { id: value.id, blend, quantity }
}

function parseOrderLine(value: unknown): OrderLine | null {
  if (!isObject(value)) return null
  const blend = parseBlend(value.blend)
  if (!blend) return null
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return { blend, quantity: Math.max(1, num(value.quantity)), unitPrice: num(value.unitPrice), lineTotal: num(value.lineTotal) }
}

export function parseOrder(value: unknown): Order | null {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.reference !== 'string') return null
  const lines = Array.isArray(value.lines) ? value.lines.map(parseOrderLine).filter((l): l is OrderLine => !!l) : []
  if (lines.length === 0) return null
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return {
    id: value.id,
    reference: value.reference,
    email: typeof value.email === 'string' ? value.email : '',
    fullName: typeof value.fullName === 'string' ? value.fullName : '',
    lines,
    subtotal: num(value.subtotal),
    shipping: num(value.shipping),
    total: num(value.total),
    createdAt: num(value.createdAt) || Date.now(),
    mode: 'demo',
  }
}

const parseList = <T>(value: unknown, parse: (v: unknown) => T | null): T[] =>
  Array.isArray(value) ? value.map(parse).filter((item): item is T => item !== null) : []

export const storage = {
  loadDraft: () => parseBlend(readRaw('draft')),
  saveDraft: (blend: Blend) => writeRaw('draft', blend),
  loadCart: () => parseList(readRaw('cart'), parseCartItem),
  saveCart: (items: CartItem[]) => writeRaw('cart', items),
  loadSaved: () => parseList(readRaw('saved'), parseBlend),
  saveSaved: (blends: Blend[]) => writeRaw('saved', blends),
  loadOrders: () => parseList(readRaw('orders'), parseOrder),
  saveOrders: (orders: Order[]) => writeRaw('orders', orders),
}

export function createId(prefix: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${random}`
}
