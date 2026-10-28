import { CLASH_RULES, LAYERS, LAYER_INFO, NOTES, NOTES_BY_ID } from './fragrance-data'
import type { ClashRule, FragranceNote, Layer } from './types'

export type AddResult =
  | { ok: true; note: FragranceNote }
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

  return { ok: true, note }
}

export function validateBlend(noteIds: string[]): BlendValidation {
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
