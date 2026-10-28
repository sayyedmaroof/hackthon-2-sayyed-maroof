import { notesFromIds } from './scoring'
import type {
  AtomizerMaterial,
  AtomizerType,
  BottleOptions,
  BottleSize,
  BottleType,
  Concentration,
  LabelStyle,
  PriceBreakdown,
} from './types'

export const SIZE_OPTIONS: { value: BottleSize; label: string; multiplier: number }[] = [
  { value: 30, label: '30 ml', multiplier: 0.75 },
  { value: 50, label: '50 ml', multiplier: 1 },
  { value: 100, label: '100 ml', multiplier: 1.7 },
]

export const CONCENTRATION_OPTIONS: {
  value: Concentration
  label: string
  detail: string
  multiplier: number
}[] = [
  { value: 'edt', label: 'Eau de Toilette', detail: '8–12% oils · lighter', multiplier: 0.85 },
  { value: 'edp', label: 'Eau de Parfum', detail: '15–18% oils · balanced', multiplier: 1 },
  { value: 'parfum', label: 'Extrait de Parfum', detail: '20–25% oils · richest', multiplier: 1.3 },
]

export const BOTTLE_TYPE_OPTIONS: { value: BottleType; label: string; price: number }[] = [
  { value: 'classic', label: 'Classic', price: 28 },
  { value: 'designer', label: 'Designer facet', price: 46 },
]

export const ATOMIZER_MATERIAL_OPTIONS: { value: AtomizerMaterial; label: string; price: number }[] = [
  { value: 'plastic', label: 'Matte polymer', price: 0 },
  { value: 'metal', label: 'Brushed copper', price: 8 },
]

export const ATOMIZER_TYPE_OPTIONS: { value: AtomizerType; label: string; price: number }[] = [
  { value: 'normal', label: 'Standard mist', price: 0 },
  { value: 'pressurized', label: 'Pressurized fine mist', price: 6 },
]

export const LABEL_OPTIONS: { value: LabelStyle; label: string; swatch: string }[] = [
  { value: 'ivory', label: 'Ivory', swatch: '#F5F0E8' },
  { value: 'noir', label: 'Noir', swatch: '#251A13' },
  { value: 'copper', label: 'Copper', swatch: '#C68149' },
]

export const SHIPPING_FLAT = 0

const round2 = (value: number) => Math.round(value * 100) / 100

export function calculatePrice(noteIds: string[], bottle: BottleOptions): PriceBreakdown {
  const notes = notesFromIds(noteIds)
  const notesSubtotal = notes.reduce((sum, note) => sum + note.price, 0)

  const size = SIZE_OPTIONS.find((o) => o.value === bottle.size) ?? SIZE_OPTIONS[1]
  const concentration = CONCENTRATION_OPTIONS.find((o) => o.value === bottle.concentration) ?? CONCENTRATION_OPTIONS[1]
  const bottleType = BOTTLE_TYPE_OPTIONS.find((o) => o.value === bottle.bottleType) ?? BOTTLE_TYPE_OPTIONS[0]
  const material = ATOMIZER_MATERIAL_OPTIONS.find((o) => o.value === bottle.atomizerMaterial) ?? ATOMIZER_MATERIAL_OPTIONS[0]
  const atomizer = ATOMIZER_TYPE_OPTIONS.find((o) => o.value === bottle.atomizerType) ?? ATOMIZER_TYPE_OPTIONS[0]

  const adjustment = round2(notesSubtotal * (size.multiplier * concentration.multiplier - 1))
  const bottleCost = bottleType.price + material.price + atomizer.price
  const unitTotal = notes.length === 0 ? 0 : round2(notesSubtotal + adjustment + bottleCost)

  return {
    notesSubtotal: round2(notesSubtotal),
    bottleCost,
    adjustment,
    unitTotal,
    lines: [
      { label: `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`, amount: round2(notesSubtotal) },
      { label: `${size.label} · ${concentration.label}`, amount: adjustment },
      { label: `${bottleType.label} bottle`, amount: bottleType.price },
      { label: material.label + ' atomizer', amount: material.price },
      { label: atomizer.label, amount: atomizer.price },
    ],
  }
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function bottleSummary(bottle: BottleOptions) {
  const concentration = CONCENTRATION_OPTIONS.find((o) => o.value === bottle.concentration)?.label
  const type = BOTTLE_TYPE_OPTIONS.find((o) => o.value === bottle.bottleType)?.label
  return `${bottle.size} ml · ${concentration} · ${type}`
}
