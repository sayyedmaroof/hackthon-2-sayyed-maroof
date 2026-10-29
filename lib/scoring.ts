import { NOTES_BY_ID } from './fragrance-data'
import {
  CONCENTRATIONS,
  blendPersistenceHours,
  hoursToLongevityScore,
  isFixative,
  longevityScoreToHours,
} from './perfumery'
import type {
  Concentration,
  Family,
  FragranceNote,
  Layer,
  Occasion,
  ProfilePhase,
  ScentAttributes,
  ScentProfile,
  Season,
} from './types'

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

const list = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/**
 * Builds the wear-curve: how the blend actually unfolds on skin, with windows
 * calibrated to the standard olfactory pyramid (top up to ~30 min, heart
 * ~20 min–4 h, drydown 3 h and beyond).
 */
function buildEvolution(notes: FragranceNote[], fixatives: string[]): ProfilePhase[] {
  const names = (layer: Layer) => notes.filter((n) => n.layer === layer).map((n) => n.name)
  const top = names('top')
  const middle = names('middle')
  const base = names('base')
  const phases: ProfilePhase[] = []

  phases.push({
    phase: 'Opening',
    window: '0 – 15 min',
    description: top.length
      ? `A bright spray of ${list(top)} — the most volatile materials rise off skin first, filling the air for 15–30 minutes before fading.`
      : 'Without a top note the blend opens directly into its heart; nothing announces the spray itself.',
  })

  phases.push({
    phase: 'Heart',
    window: '20 min – 3 h',
    description: middle.length
      ? `As the opening burns off, the heart steps forward: ${list(middle)} shape the scent for roughly the first third of the day.`
      : 'No true heart material is present, so the opening hands off abruptly to the drydown.',
  })

  const anchor = fixatives.length ? `, anchored by ${list(fixatives)}` : ''
  phases.push({
    phase: 'Drydown',
    window: '3 h +',
    description: base.length
      ? `The drydown is what you wear for most of the day: ${list(base)} linger for hours${anchor}, slowing the release of everything above them.`
      : 'Without base notes there is no drydown — the blend ends when the heart fades.',
  })

  return phases
}

/**
 * Computes the scent profile. The optional concentration applies the real
 * effect of dilution: EDT is lighter and radiates more, Extrait is richer,
 * longer-lasting — but sits closer to the skin.
 */
export function computeProfile(
  noteIds: string[],
  concentration: Concentration = 'edp',
): ScentProfile | null {
  const notes = notesFromIds(noteIds)
  if (notes.length === 0) return null

  const conc = CONCENTRATIONS[concentration]

  const freshness = weightedAverage(notes, 'freshness', PRESENCE_WEIGHT)
  const sweetness = weightedAverage(notes, 'sweetness', PRESENCE_WEIGHT)
  const warmth = weightedAverage(notes, 'warmth', PRESENCE_WEIGHT)
  const polarizing = weightedAverage(notes, 'polarizing', PRESENCE_WEIGHT)

  // Longevity comes from a realistic persistence model (per-note hours in the
  // published pyramid bands, plus fixative synergy and dilution), not a
  // simple attribute average.
  const longevity = hoursToLongevityScore(blendPersistenceHours(noteIds, concentration))

  const intensity = clamp(weightedAverage(notes, 'intensity', PRESENCE_WEIGHT) * conc.intensityFactor)
  // Extrait radiates less than EDT at equal formula — concentration shifts
  // projection down as it shifts richness up.
  const projection = clamp(
    (0.7 * weightedAverage(notes, 'projection', PRESENCE_WEIGHT) + 0.3 * intensity) * conc.projectionFactor,
  )

  const layers = new Set(notes.map((n) => n.layer))
  const crowdAppeal = clamp(10 - polarizing * 0.8 - Math.max(0, intensity - 7) * 0.6 + (layers.size === 3 ? 0.6 : 0))

  const familyWeights = new Map<Family, number>()
  for (const note of notes) {
    familyWeights.set(note.family, (familyWeights.get(note.family) ?? 0) + PRESENCE_WEIGHT[note.layer])
  }
  const totalFamilyWeight = [...familyWeights.values()].reduce((a, b) => a + b, 0)
  const familyMix = [...familyWeights.entries()]
    .map(([family, share]) => ({ family, share: share / totalFamilyWeight }))
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

  // Presence-weight shares per layer — the realistic formula proportions
  // (top ~15–30%, heart ~30–50%, base ~40–50% in a classic fine fragrance).
  const layerWeight: Record<Layer, number> = { top: 0, middle: 0, base: 0 }
  for (const note of notes) layerWeight[note.layer] += PRESENCE_WEIGHT[note.layer]
  const totalLayerWeight = layerWeight.top + layerWeight.middle + layerWeight.base
  const pyramid = {
    top: layerWeight.top / totalLayerWeight,
    middle: layerWeight.middle / totalLayerWeight,
    base: layerWeight.base / totalLayerWeight,
  }

  const fixativeNames = notes.filter(isFixative).map((n) => n.name)

  return {
    family: familyMix[0].family,
    familyMix,
    freshness: round1(freshness),
    sweetness: round1(sweetness),
    warmth: round1(warmth),
    intensity: round1(intensity),
    longevity: round1(longevity),
    projection: round1(projection),
    crowdAppeal: round1(crowdAppeal),
    polarizing: round1(polarizing),
    character,
    occasions: topTallies<Occasion>(notes, (n) => n.occasions, 2),
    seasons: topTallies<Season>(notes, (n) => n.seasons, 2),
    timeOfDay,
    genderLean,
    ageRange,
    color: blendColor(notes, warmth),
    pyramid,
    evolution: buildEvolution(notes, fixativeNames),
    fixativeNames,
  }
}

export function longevityHours(score: number) {
  const hours = longevityScoreToHours(score)
  if (hours < 0.75) return '≤ 45 min'
  if (hours < 2) return '1–2 h'
  if (hours < 3.5) return '2–3 h'
  if (hours < 5) return '3–5 h'
  if (hours < 7) return '5–7 h'
  if (hours < 9) return '7–9 h'
  return '9–12 h'
}
