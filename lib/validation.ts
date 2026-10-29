import { CLASH_RULES, LAYER_INFO, LAYERS, NOTES, NOTES_BY_ID } from './fragrance-data'
import {
  blendPersistenceHours,
  getIfraGuideline,
  phototoxicNoteIds,
} from './perfumery'
import type { BlendWarning, ClashRule, Concentration, FragranceNote, Layer } from './types'

export type AddResult =
  | { ok: true; note: FragranceNote; warnings?: BlendWarning[] }
  | {
      ok: false
      code: 'unknown' | 'duplicate' | 'layer' | 'clash'
      message: string
      note?: FragranceNote
      conflictingNote?: FragranceNote
      rule?: ClashRule
      alternatives: FragranceNote[]
    }

export interface BlendIssue {
  rule: ClashRule
  noteA: FragranceNote
  noteB: FragranceNote
}

export interface BlendValidation {
  valid: boolean
  complete: boolean
  issues: BlendIssue[]
  missingLayers: Layer[]
  countByLayer: Record<Layer, number>
  /** Non-blocking formula reviews: structure, balance, performance, IFRA safety. */
  warnings: BlendWarning[]
}

export function findClash(a: string, b: string): ClashRule | undefined {
  return CLASH_RULES.find(
    (rule) =>
      (rule.notes[0] === a && rule.notes[1] === b) || (rule.notes[0] === b && rule.notes[1] === a),
  )
}

function clashesWithBlend(noteId: string, blendIds: string[]) {
  for (const existing of blendIds) {
    const rule = findClash(noteId, existing)
    if (rule) return { rule, existing }
  }
  return undefined
}

function compatibleAlternatives(incoming: FragranceNote, blendIds: string[], rule?: ClashRule) {
  const isCandidate = (id: string) =>
    id !== incoming.id && !blendIds.includes(id) && !clashesWithBlend(id, blendIds) && NOTES_BY_ID[id]

  const fromRule = (rule?.alternatives[incoming.id] ?? []).filter(isCandidate)
  const sameLayerAndFamily = NOTES.filter(
    (note) =>
      note.layer === incoming.layer &&
      note.family === incoming.family &&
      isCandidate(note.id) &&
      !fromRule.includes(note.id),
  ).map((note) => note.id)

  return [...fromRule, ...sameLayerAndFamily].slice(0, 3).map((id) => NOTES_BY_ID[id])
}

export function validateAdd(blendIds: string[], noteId: string, targetLayer?: Layer): AddResult {
  const note = NOTES_BY_ID[noteId]
  if (!note) {
    return { ok: false, code: 'unknown', message: 'That note is not in our library.', alternatives: [] }
  }

  if (blendIds.includes(noteId)) {
    return {
      ok: false,
      code: 'duplicate',
      message: `${note.name} is already part of your blend.`,
      note,
      alternatives: [],
    }
  }

  if (targetLayer && targetLayer !== note.layer) {
    return {
      ok: false,
      code: 'layer',
      message: `${note.name} is a ${LAYER_INFO[note.layer].short.toLowerCase()} note and can only sit in the ${LAYER_INFO[note.layer].label.toLowerCase()} layer.`,
      note,
      alternatives: NOTES.filter(
        (candidate) =>
          candidate.layer === targetLayer &&
          !blendIds.includes(candidate.id) &&
          !clashesWithBlend(candidate.id, blendIds),
      ).slice(0, 3),
    }
  }

  const clash = clashesWithBlend(noteId, blendIds)
  if (clash) {
    const conflictingNote = NOTES_BY_ID[clash.existing]
    return {
      ok: false,
      code: 'clash',
      message: `${note.name} clashes with ${conflictingNote.name}. ${clash.rule.reason}`,
      note,
      conflictingNote,
      rule: clash.rule,
      alternatives: compatibleAlternatives(note, blendIds, clash.rule),
    }
  }

  return { ok: true, note, warnings: noteAdvisories(blendIds, noteId) }
}

// ─── Formula-review engine (advisory warnings) ──────────────────────────────
//
// Acordance with real perfumery practice: layer proportions should fall inside
// the classic pyramid ranges (top ~15–30%, heart ~30–50%, base ~40–50%),
// expressed citrus/cumin oils are phototoxic (IFRA), oakmoss and birch tar are
// heavily regulated, and dilution matters — a sweet resin-heavy formula in
// Eau de Toilette reads flat and short-lived.

const PRESENCE_WEIGHT: Record<Layer, number> = { top: 0.8, middle: 1, base: 1.2 }

/** Classic standby fixatives we nudge builders toward when longevity is low. */
const FIXATIVE_SUGGESTION_IDS = ['musk', 'ambroxan', 'vanilla', 'sandalwood', 'tonka', 'benzoin']

function fixativeSuggestions(blendIds: string[]) {
  return FIXATIVE_SUGGESTION_IDS.filter((id) => !blendIds.includes(id))
    .slice(0, 3)
    .map((id) => NOTES_BY_ID[id].name)
}

const joinList = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/**
 * Full formula review for an existing blend. Warnings are advisory — they do
 * not block checkout or saving, they teach the builder what a perfumer would
 * flag at the organ.
 */
export function blendWarnings(
  noteIds: string[],
  concentration: Concentration = 'edp',
): BlendWarning[] {
  const notes = noteIds.map((id) => NOTES_BY_ID[id]).filter((note): note is FragranceNote => Boolean(note))
  if (notes.length < 2) return []

  const warnings: BlendWarning[] = []
  const countByLayer: Record<Layer, number> = { top: 0, middle: 0, base: 0 }
  const layerWeight: Record<Layer, number> = { top: 0, middle: 0, base: 0 }
  for (const note of notes) {
    countByLayer[note.layer] += 1
    layerWeight[note.layer] += PRESENCE_WEIGHT[note.layer]
  }
  const totalWeight = layerWeight.top + layerWeight.middle + layerWeight.base
  const shares = {
    top: layerWeight.top / totalWeight,
    middle: layerWeight.middle / totalWeight,
    base: layerWeight.base / totalWeight,
  }

  // ── Structure: pyramid proportions ────────────────────────────────────────
  if (shares.top > 0.5) {
    warnings.push({
      id: 'top-heavy',
      type: 'structure',
      message: `More than half of the blend's weight sits in volatile top materials, yet nothing in this band survives past the first 30 minutes. In classic compositions the opening is only ~15–30% of the formula.`,
      suggestion: 'Balance the pyramid with heart and base notes that hold the line.',
    })
  }
  if (shares.base > 0.65) {
    warnings.push({
      id: 'base-heavy',
      type: 'structure',
      message: 'The formula is base-heavy — dense, slow materials dominate, and an over-loaded drydown can "cling to the skin" without blooming a trail.',
      suggestion: 'Lighten the base or anchor it with an airy volatile opening that radiates.',
    })
  }
  if (countByLayer.middle === 0 && countByLayer.top > 0 && countByLayer.base > 0) {
    warnings.push({
      id: 'no-heart',
      type: 'structure',
      message: 'There is no heart material to bridge the opening to the drydown, so the hand-off will feel abrupt.',
      suggestion: 'Add floral, spicy or green heart notes for a smooth transition.',
    })
  }
  // Redundant top notes: three or more materials of the same family fighting
  // for the same 15 minutes.
  const topByFamily = new Map<string, number>()
  for (const note of notes) {
    if (note.layer === 'top') topByFamily.set(note.family, (topByFamily.get(note.family) ?? 0) + 1)
  }
  for (const [family, count] of topByFamily) {
    if (count >= 3) {
      const names = notes.filter((n) => n.layer === 'top' && n.family === family).map((n) => n.name)
      warnings.push({
        id: `top-redundant-${family}`,
        type: 'balance',
        message: `${count} top notes of the same family (${joinList(names)}) repeat the same 15-minute accent instead of extending it.`,
        suggestion: 'Keep one star citrus/green and vary the others with a contrasting top family.',
      })
      break
    }
  }

  // ── Performance: volatility & dilution ────────────────────────────────────
  const hours = blendPersistenceHours(noteIds, concentration)
  if (hours < 3) {
    const suggestions = fixativeSuggestions(noteIds)
    warnings.push({
      id: 'short-lived',
      type: 'performance',
      message: `Volatility maths puts this blend at roughly ${hours < 1 ? 'under an hour' : `1–${Math.round(hours)} hour${hours < 2 ? '' : 's'}`} on skin — too light to survive the morning.`,
      suggestion: suggestions.length
        ? `Anchor it with slow-evaporating fixatives such as ${joinList(suggestions)}.`
        : 'Consider upgrading the concentration (EDP or Extrait) to stretch its lifespan.',
    })
  }
  const gourmandBases = notes.filter((n) => n.layer === 'base' && n.family === 'gourmand')
  if (gourmandBases.length >= 3 && concentration === 'edt') {
    warnings.push({
      id: 'gourmand-edt',
      type: 'performance',
      message: `A rich, sweet resin base is barely expressed at Eau de Toilette dilution (5–15% oil) — vanilla, caramel and confectionery accords need higher oil load to bloom.`,
      suggestion: 'Switch to Eau de Parfum (15–20%) or Extrait (20–40%) for a plush drydown.',
    })
  }

  // ── Safety: IFRA (51st Amendment) flags ───────────────────────────────────
  const photo = phototoxicNoteIds(noteIds)
  if (photo.length >= 2) {
    const names = photo.map((id) => NOTES_BY_ID[id].name)
    warnings.push({
      id: 'ifra-phototoxic',
      type: 'safety',
      message: `This blend stacks ${joinList(names)} — IFRA treats phototoxic furocoumarins cumulatively, so expressed citrus oils must share one sun-safety budget (bergapten ≤ 15 ppm on skin).`,
      suggestion: 'Avoid sun-exposed skin after wear, or keep a single expressed citrus as the opening.',
    })
  }
  for (const note of notes) {
    const guideline = getIfraGuideline(note.id)
    if (guideline && guideline.type !== 'phototoxic') {
      warnings.push({
        id: `ifra-${note.id}`,
        type: 'safety',
        message: `${note.name}: ${guideline.message}`,
      })
    }
  }

  // ── Cohesion & wearability ────────────────────────────────────────────────
  const avgPolarizing = notes.reduce((a, n) => a + n.attributes.polarizing, 0) / notes.length
  if (avgPolarizing > 6) {
    const loudest = notes
      .filter((n) => n.attributes.polarizing >= 8)
      .sort((a, b) => b.attributes.polarizing - a.attributes.polarizing)
      .slice(0, 2)
      .map((n) => n.name)
    warnings.push({
      id: 'divisive',
      type: 'coherence',
      message: `Divisive materials${loudest.length ? ` (${joinList(loudest)})` : ''} push this well outside most noses' comfort zone — a niche statement rather than a crowd-pleaser.`,
      suggestion: 'Soften with clean musk, white florals or a light citrus lift.',
    })
  }
  if (shares.base > 0.45 && countByLayer.base >= 3) {
    const coolOnly = notes
      .filter((n) => n.layer === 'base')
      .every((n) => n.seasons.every((s) => s === 'autumn' || s === 'winter'))
    if (coolOnly) {
      warnings.push({
        id: 'cool-weather-base',
        type: 'coherence',
        message: 'The drydown is built from cool-weather resins and deep woods — in summer heat and humidity these same materials magnify and can feel suffocating.',
        suggestion: 'Reserve it for evening and cooler months, or cool the base with vetiver or cedar.',
      })
    }
  }

  return warnings
}

/**
 * Advisory review for a single incoming note. Non-blocking: these surface as
 * gentle toasts/notes when the add succeeds, so the builder learns why the
 * new material matters before it goes on the shelf.
 */
export function noteAdvisories(blendIds: string[], noteId: string): BlendWarning[] {
  const incoming = NOTES_BY_ID[noteId]
  if (!incoming || blendIds.length === 0) return []

  const advisories: BlendWarning[] = []

  // Phototoxic stacking: expressed citrus + cumin share one IFRA sun budget.
  const guideline = getIfraGuideline(incoming.id)
  if (guideline?.type === 'phototoxic' && phototoxicNoteIds(blendIds).length > 0) {
    advisories.push({
      id: 'phototoxic-stack',
      type: 'safety',
      message: `${incoming.name} links up with the other expressed oils in this blend — IFRA counts their combined furocoumarin load against one sun-exposure limit.`,
      suggestion: 'Fine for wear; just avoid hours of direct sun on treated skin.',
    })
  }

  // Longevity check on the hypothetical blend that includes this note.
  const withNote = [...blendIds, noteId]
  const hours = blendPersistenceHours(withNote)
  if (hours < 3) {
    advisories.push({
      id: 'volatile',
      type: 'performance',
      message: `Even with ${incoming.name}, this blend is projected to fade inside roughly ${Math.round(hours)} h — consider adding a fixative base.`,
    })
  }

  return advisories
}

export function validateBlend(
  noteIds: string[],
  concentration: Concentration = 'edp',
): BlendValidation {
  const issues: BlendIssue[] = []
  for (let i = 0; i < noteIds.length; i++) {
    for (let j = i + 1; j < noteIds.length; j++) {
      const rule = findClash(noteIds[i], noteIds[j])
      if (rule) {
        issues.push({ rule, noteA: NOTES_BY_ID[noteIds[i]], noteB: NOTES_BY_ID[noteIds[j]] })
      }
    }
  }

  const countByLayer: Record<Layer, number> = { top: 0, middle: 0, base: 0 }
  for (const id of noteIds) {
    const note = NOTES_BY_ID[id]
    if (note) countByLayer[note.layer] += 1
  }
  const missingLayers = LAYERS.filter((layer) => countByLayer[layer] === 0)

  return {
    valid: issues.length === 0 && missingLayers.length === 0,
    complete: missingLayers.length === 0,
    issues,
    missingLayers,
    countByLayer,
    warnings: blendWarnings(noteIds, concentration),
  }
}

/** Keeps only known, unique note IDs. Used for untrusted input (storage, API bodies). */
export function sanitizeNoteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  for (const id of value) {
    if (typeof id === 'string' && NOTES_BY_ID[id]) seen.add(id)
  }
  return [...seen]
}

export function groupByLayer(noteIds: string[]): Record<Layer, FragranceNote[]> {
  const groups: Record<Layer, FragranceNote[]> = { top: [], middle: [], base: [] }
  for (const id of noteIds) {
    const note = NOTES_BY_ID[id]
    if (note) groups[note.layer].push(note)
  }
  return groups
}
