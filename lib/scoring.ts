import { NOTES_BY_ID } from './fragrance-data'
import type { Family, FragranceNote, Layer, Occasion, ScentAttributes, ScentProfile, Season } from './types'

const PRESENCE_WEIGHT: Record<Layer, number> = { top: 0.8, middle: 1, base: 1.2 }
const LONGEVITY_WEIGHT: Record<Layer, number> = { top: 0.35, middle: 0.9, base: 1.6 }

const clamp = (value: number, min = 0, max = 10) => Math.min(max, Math.max(min, value))
const round1 = (value: number) => Math.round(value * 10) / 10

function weightedAverage(
  notes: FragranceNote[],
  key: keyof ScentAttributes,
  weights: Record<Layer, number>,
) {
  let total = 0
  let weightSum = 0
  for (const note of notes) {
    total += note.attributes[key] * weights[note.layer]
    weightSum += weights[note.layer]
  }
  return weightSum === 0 ? 0 : total / weightSum
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}

function rgbToHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

function blendColor(notes: FragranceNote[], warmth: number) {
  let rgb: [number, number, number] = [0, 0, 0]
  let weightSum = 0
  for (const note of notes) {
    const [r, g, b] = hexToRgb(note.color)
    const w = PRESENCE_WEIGHT[note.layer]
    rgb = [rgb[0] + r * w, rgb[1] + g * w, rgb[2] + b * w]
    weightSum += w
  }
  const mixed: [number, number, number] = [rgb[0] / weightSum, rgb[1] / weightSum, rgb[2] / weightSum]
  // Warmer blends read as deeper amber liquid.
  const depth = (warmth / 10) * 0.35
  const amber: [number, number, number] = [150, 82, 34]
  return rgbToHex([
    mixed[0] * (1 - depth) + amber[0] * depth,
    mixed[1] * (1 - depth) + amber[1] * depth,
    mixed[2] * (1 - depth) + amber[2] * depth,
  ])
}

function topTallies<T extends string>(notes: FragranceNote[], pick: (n: FragranceNote) => T[], limit: number) {
  const tally = new Map<T, number>()
  for (const note of notes) {
    for (const item of pick(note)) {
      tally.set(item, (tally.get(item) ?? 0) + PRESENCE_WEIGHT[note.layer])
    }
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([item]) => item)
}

export function notesFromIds(noteIds: string[]): FragranceNote[] {
  return noteIds.map((id) => NOTES_BY_ID[id]).filter((note): note is FragranceNote => Boolean(note))
}

export const EMPTY_BLEND_COLOR = '#D8E6F2'

export function computeProfile(noteIds: string[]): ScentProfile | null {
  const notes = notesFromIds(noteIds)
  if (notes.length === 0) return null

  const freshness = weightedAverage(notes, 'freshness', PRESENCE_WEIGHT)
  const sweetness = weightedAverage(notes, 'sweetness', PRESENCE_WEIGHT)
  const warmth = weightedAverage(notes, 'warmth', PRESENCE_WEIGHT)
  const intensity = weightedAverage(notes, 'intensity', PRESENCE_WEIGHT)
  const polarizing = weightedAverage(notes, 'polarizing', PRESENCE_WEIGHT)
  const longevity = weightedAverage(notes, 'longevity', LONGEVITY_WEIGHT)
  const projection = 0.7 * weightedAverage(notes, 'projection', PRESENCE_WEIGHT) + 0.3 * intensity

  const layers = new Set(notes.map((n) => n.layer))
  const crowdAppeal = clamp(10 - polarizing * 0.8 - Math.max(0, intensity - 7) * 0.6 + (layers.size === 3 ? 0.6 : 0))

  const familyWeights = new Map<Family, number>()
  for (const note of notes) {
    familyWeights.set(note.family, (familyWeights.get(note.family) ?? 0) + PRESENCE_WEIGHT[note.layer])
  }
  const totalFamilyWeight = [...familyWeights.values()].reduce((a, b) => a + b, 0)
  const familyMix = [...familyWeights.entries()]
    .map(([family, weight]) => ({ family, share: weight / totalFamilyWeight }))
    .sort((a, b) => b.share - a.share)

  const share = (families: Family[]) =>
    familyMix.filter((f) => families.includes(f.family)).reduce((a, b) => a + b.share, 0)
  const softShare = share(['floral', 'gourmand'])
  const darkShare = share(['woody', 'spicy'])
  const genderLean =
    softShare - darkShare > 0.3 ? 'Feminine lean' : darkShare - softShare > 0.3 ? 'Masculine lean' : 'Unisex'

  const timeOfDay =
    warmth + intensity * 0.5 > freshness + 5
      ? 'Evening & night'
      : freshness >= 6.5
        ? 'Daytime'
        : 'Day into evening'

  const ageRange = intensity > 6.5 || polarizing > 5.5 ? '28–45' : freshness > 6.5 ? '18–35' : '22–40'
  const character: ScentProfile['character'] = polarizing >= 5.5 ? 'Bold' : polarizing >= 3.2 ? 'Balanced' : 'Safe'

  return {
    family: familyMix[0].family,
    familyMix,
    freshness: round1(freshness),
    sweetness: round1(sweetness),
    warmth: round1(warmth),
    intensity: round1(intensity),
    longevity: round1(longevity),
    projection: round1(clamp(projection)),
    crowdAppeal: round1(crowdAppeal),
    polarizing: round1(polarizing),
    character,
    occasions: topTallies<Occasion>(notes, (n) => n.occasions, 2),
    seasons: topTallies<Season>(notes, (n) => n.seasons, 2),
    timeOfDay,
    genderLean,
    ageRange,
    color: blendColor(notes, warmth),
  }
}

export function longevityHours(score: number) {
  if (score >= 8.5) return '8–12 h'
  if (score >= 7) return '6–8 h'
  if (score >= 5) return '4–6 h'
  return '2–4 h'
}
