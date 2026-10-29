/**
 * perfumery.ts — Authentic perfumery reference data powering the scoring and
 * validation engines. Grounded in established perfumery references rather than
 * invented numbers:
 *
 * • Evaporation bands follow Poucher's volatility coefficient system
 *   (top notes 1–14, heart notes 15–60, base notes 61–100).
 * • On-skin timings follow the standard olfactory pyramid
 *   (top 15–30 min, heart ~20 min–4 h, base ~1 h–12 h+).
 * • Fixative behaviour: heavy base materials (resins, woods, musks,
 *   ambroxan) slow the evaporation of lighter notes — a real but modest effect.
 * • Concentration ranges match industry norms:
 *   EDT 5–15% oil (3–6 h), EDP 15–20% (5–8 h), Extrait 20–40% (8 h+).
 *   Extrait lasts longer but sits closer to the skin than EDT, which radiates.
 * • IFRA guidance reflects the 51st Amendment: phototoxic furocoumarins in
 *   expressed citrus and cumin, atranol limits on oakmoss, the crude birch-tar
 *   prohibition (rectified only), and the eugenol (clove) restriction.
 */
import { NOTES_BY_ID } from './fragrance-data'
import type { Concentration, FragranceNote, Layer } from './types'

// ─── Volatility: Poucher evaporation coefficients ───────────────────────────

/** Poucher's coefficient bands: how fast a layer's molecules fly off skin. */
export const VOLATILITY_BANDS: Record<Layer, { min: number; max: number }> = {
  top: { min: 1, max: 14 },
  middle: { min: 15, max: 60 },
  base: { min: 61, max: 100 },
}

/**
 * Positions a note inside its layer's volatility band using the house
 * longevity assessment (1–10), so a short-lived citrus like lemon sits at the
 * volatile end of the top band while tenacious lavender sits higher.
 * 1 = most volatile (flees first), 100 = least volatile (lingers last).
 */
export function evaporationCoefficient(note: FragranceNote): number {
  const band = VOLATILITY_BANDS[note.layer]
  const t = Math.min(1, Math.max(0, note.attributes.longevity / 10))
  return Math.round(band.min + t * (band.max - band.min))
}

/**
 * Realistic on-skin persistence for a single note, in hours, calibrated to
 * published pyramid timings: top materials fade within 15–60 minutes, heart
 * notes carry for roughly 1.5–4 hours, and heavy base materials last 3–12+ h
 * (ambroxan and oud sit at the very top of that range).
 */
export function notePersistenceHours(note: FragranceNote): number {
  const t = note.attributes.longevity / 10
  switch (note.layer) {
    case 'top':
      return 0.25 + t * 0.75 // 15 min → 1 h
    case 'middle':
      return 1.5 + t * 2.5 // 1.5 h → 4 h
    default:
      return 3 + t * 9 // 3 h → 12 h
  }
}

// ─── Fixatives ──────────────────────────────────────────────────────────────

/**
 * Materials in the catalogue long known to act as fixatives: they evaporate
 * slowly and slow the release of lighter notes around them.
 */
export const FIXATIVE_NOTE_IDS = new Set([
  'vanilla',
  'tonka',
  'benzoin',
  'labdanum',
  'amber',
  'ambergris',
  'myrrh',
  'frankincense',
  'opoponax',
  'peru-balsam',
  'musk',
  'ambroxan',
  'iso-e-super',
  'cashmeran',
  'sandalwood',
  'cedarwood',
  'oud',
  'guaiac',
  'patchouli',
  'vetiver',
  'oakmoss',
  'beeswax',
  'honey',
  'cacao',
])

export function isFixative(note: FragranceNote): boolean {
  return note.layer === 'base' && FIXATIVE_NOTE_IDS.has(note.id)
}

const PRESENCE_WEIGHT: Record<Layer, number> = { top: 0.8, middle: 1, base: 1.2 }

/**
 * Blend-level persistence model. Starts from a presence-weighted mean of each
 * note's realistic on-skin hours, then applies two authentic adjustments:
 *
 * 1. Fixative synergy — the share of blend weight carried by fixative
 *    materials modestly extends the whole blend (the known fixative effect).
 * 2. Concentration — EDT/EDP/Extrait oil percentages (5–15% / 15–20% /
 *    20–40%) roughly follow EDT ×0.7 / EDP ×1.0 / Extrait ×1.4 lifespan.
 */
export function blendPersistenceHours(
  noteIds: string[],
  concentration: Concentration = 'edp',
): number {
  const notes = noteIds.map((id) => NOTES_BY_ID[id]).filter((note): note is FragranceNote => Boolean(note))
  if (notes.length === 0) return 0

  let total = 0
  let weightSum = 0
  let fixativeWeight = 0
  for (const note of notes) {
    const w = PRESENCE_WEIGHT[note.layer]
    total += notePersistenceHours(note) * w
    weightSum += w
    if (isFixative(note)) fixativeWeight += w
  }
  const naive = total / weightSum
  const fixativeBoost = 1 + (fixativeWeight / weightSum) * 0.4 // modest, real-world fixative effect
  return naive * fixativeBoost * CONCENTRATIONS[concentration].longevityFactor
}

// ─── Longevity score ↔ hours calibration ───────────────────────────────────—

// Interpolation anchors [hours → longevity score 1–10].
const HOURS_TO_SCORE: [number, number][] = [
  [0.5, 0.8],
  [1, 1.8],
  [2, 3],
  [3, 4.5],
  [5, 6.5],
  [8, 8.5],
  [12, 10],
]

export function hoursToLongevityScore(hours: number): number {
  const clampHours = Math.min(HOURS_TO_SCORE[HOURS_TO_SCORE.length - 1][0], Math.max(HOURS_TO_SCORE[0][0], hours))
  for (let i = 1; i < HOURS_TO_SCORE.length; i++) {
    const [h1, s1] = HOURS_TO_SCORE[i]
    const [h0, s0] = HOURS_TO_SCORE[i - 1]
    if (clampHours <= h1) return s0 + ((clampHours - h0) / (h1 - h0)) * (s1 - s0)
  }
  return 10
}

export function longevityScoreToHours(score: number): number {
  for (let i = 1; i < HOURS_TO_SCORE.length; i++) {
    const [h1, s1] = HOURS_TO_SCORE[i]
    const [h0, s0] = HOURS_TO_SCORE[i - 1]
    if (score <= s1) return h0 + ((score - s0) / (s1 - s0)) * (h1 - h0)
  }
  return 12
}

// ─── Concentration (dilution) data ──────────────────────────────────────────

export interface ConcentrationSpec {
  id: Concentration
  label: string
  /** Fragrance-oil range in the finished product (industry norms). */
  oilPct: [number, number]
  /** Typical lifespan vs EDP: EDT 3–6 h, EDP 5–8 h, Extrait 8 h+. */
  longevityFactor: number
  /**
   * Radiance vs EDP: EDT alcohol carries fresh molecules further, while
   * concentrated Extrait clings closer to the skin — higher oil percentage
   * does not mean more sillage.
   */
  projectionFactor: number
  /** Perceived body/richness of the accord. */
  intensityFactor: number
}

export const CONCENTRATIONS: Record<Concentration, ConcentrationSpec> = {
  edt: {
    id: 'edt',
    label: 'Eau de Toilette',
    oilPct: [5, 15],
    longevityFactor: 0.7,
    projectionFactor: 1.12,
    intensityFactor: 0.85,
  },
  edp: {
    id: 'edp',
    label: 'Eau de Parfum',
    oilPct: [15, 20],
    longevityFactor: 1,
    projectionFactor: 1,
    intensityFactor: 1,
  },
  parfum: {
    id: 'parfum',
    label: 'Extrait de Parfum',
    oilPct: [20, 40],
    longevityFactor: 1.4,
    projectionFactor: 0.85,
    intensityFactor: 1.18,
  },
}

// ─── IFRA (51st Amendment) safety guidance ──────────────────────────────────

export interface IfraGuideline {
  type: 'phototoxic' | 'restriction' | 'specification'
  /** Details for quiz/compliance copy shown to the user. */
  message: string
}

/**
 * Mapped onto note ids already in the catalogue. Every entry reflects a real
 * IFRA Standard: expressed citrus oils and cumin oil are phototoxic
 * (furocoumarins); oakmoss is restricted for atranol/chloroatranol (0.4%
 * category caps); crude birch tar is prohibited so only rectified tar meeting
 * PAH limits may be used; clove oil is restricted for its eugenol content;
 * styrax and opoponax require rectification (PAH limits).
 */
export const IFRA_GUIDELINES: Record<string, IfraGuideline> = {
  bergamot: {
    type: 'phototoxic',
    message: 'Expressed bergamot oil is phototoxic — IFRA caps it at 0.4% of leave-on products because of its bergapten (furocoumarin) content.',
  },
  lemon: {
    type: 'phototoxic',
    message: 'Cold-pressed lemon oil is phototoxic under the IFRA furocoumarin standard; it should not top up sun-exposed skin at full strength.',
  },
  lime: {
    type: 'phototoxic',
    message: 'Expressed lime oil carries phototoxic furocoumarins and is covered by the IFRA citrus-oils restriction.',
  },
  grapefruit: {
    type: 'phototoxic',
    message: 'Expressed grapefruit oil is phototoxic under the IFRA furocoumarin standard.',
  },
  'bitter-orange': {
    type: 'phototoxic',
    message: 'Expressed bitter orange (bigarade) peel oil is phototoxic and IFRA-restricted.',
  },
  cumin: {
    type: 'phototoxic',
    message: 'Cumin seed oil is a naturally phototoxic furocoumarin carrier in the IFRA citrus/furocoumarin standard.',
  },
  oakmoss: {
    type: 'restriction',
    message: 'Oakmoss is IFRA-restricted for atranol/chloroatranol; modern chypres use ≈0.4%-capped purified absolutes.',
  },
  birch: {
    type: 'specification',
    message: 'Crude birch tar is outright prohibited by IFRA — only rectified birch tar meeting ≤1 ppb PAH limits is perfumery-legal.',
  },
  clove: {
    type: 'restriction',
    message: "Clove bud oil is restricted for its eugenol content (a recognised skin sensitiser), so it's used at low dosage.",
  },
  styrax: {
    type: 'specification',
    message: 'Raw styrax is never used undiluted; IFRA requires rectified styrax oil meeting PAH specifications.',
  },
  opoponax: {
    type: 'specification',
    message: 'Opoponax must be rectified (cleaned of polynuclear aromatic hydrocarbons) before use, per IFRA.',
  },
}

const PHOTO_TOXIC_IDS = new Set(
  Object.entries(IFRA_GUIDELINES)
    .filter(([, g]) => g.type === 'phototoxic')
    .map(([id]) => id),
)

/** Note ids in the blend carrying phototoxic furocoumarins. */
export function phototoxicNoteIds(noteIds: string[]): string[] {
  return noteIds.filter((id) => PHOTO_TOXIC_IDS.has(id))
}

export function getIfraGuideline(noteId: string): IfraGuideline | undefined {
  return IFRA_GUIDELINES[noteId]
}
