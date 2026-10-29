/**
 * assistant.ts — Client-side intent resolver for the Scent Advisor chat.
 * Maps natural language commands to concrete composition actions.
 */

import { NOTES, NOTES_BY_ID } from './fragrance-data'
import type { Concentration } from './types'
import { validateAdd } from './validation'

// ─── Action Types ──────────────────────────────────────────────────────────

export type AssistantAction =
  | { type: 'ADD'; noteId: string; reason: string }
  | { type: 'REMOVE'; noteId: string; reason: string }
  | { type: 'REPLACE'; oldId: string; newId: string; reason: string }
  | { type: 'SET_CONCENTRATION'; value: Concentration; reason: string }
  | { type: 'EXPLAIN' }
  | { type: 'CLARIFY'; prompt: string }
  | { type: 'NONE' }

// ─── Suggestion Chips ──────────────────────────────────────────────────────

export const SUGGESTION_CHIPS: { label: string; message: string }[] = [
  { label: 'Make it last longer', message: 'Make this last longer' },
  { label: 'Add freshness', message: 'Make this fresher and lighter' },
  { label: 'More projection', message: 'Make it project further' },
  { label: 'Warmer for evening', message: 'Make it warmer for evening wear' },
  { label: 'Crowd-pleaser', message: 'Make it more crowd-pleasing' },
  { label: 'Explain this blend', message: 'Explain how this will smell' },
]

// ─── Intent Resolver ───────────────────────────────────────────────────────

export function resolveIntent(message: string, currentNoteIds: string[]): AssistantAction {
  const lower = message.toLowerCase()
  const words = lower.split(/\s+/)

  // Empty blend handling
  if (currentNoteIds.length === 0 && !lower.includes('explain')) {
    return { type: 'CLARIFY', prompt: 'Your blend is empty. Add some notes first, then I can help you refine it.' }
  }

  // ── Explain / Questions ────────────────────────────────────────────────

  if (
    lower.includes('explain') ||
    lower.includes('how will') ||
    lower.includes('what does') ||
    lower.includes('smell like') ||
    lower.includes('describe')
  ) {
    return { type: 'EXPLAIN' }
  }

  // ── Longevity / Lasting ────────────────────────────────────────────────

  if (
    lower.includes('longer') ||
    lower.includes('last') ||
    lower.includes('longevity') ||
    lower.includes('duration') ||
    lower.includes('staying power')
  ) {
    const candidate = findBestCompatibleNote(currentNoteIds, (note) => {
      return note.layer === 'base' && note.attributes.longevity >= 8
    })

    if (candidate) {
      return {
        type: 'ADD',
        noteId: candidate.id,
        reason: `${candidate.name} is a long-lasting base note with excellent longevity on skin.`,
      }
    }

    // Suggest concentration upgrade if no note can be added
    return {
      type: 'SET_CONCENTRATION',
      value: 'parfum',
      reason: 'Upgrading to Parfum concentration will significantly improve longevity.',
    }
  }

  // ── Projection / Sillage ───────────────────────────────────────────────

  if (
    lower.includes('projection') ||
    lower.includes('sillage') ||
    lower.includes('stronger') ||
    lower.includes('further') ||
    lower.includes('powerful')
  ) {
    const candidate = findBestCompatibleNote(currentNoteIds, (note) => {
      return note.attributes.projection >= 7
    })

    if (candidate) {
      return {
        type: 'ADD',
        noteId: candidate.id,
        reason: `${candidate.name} has strong projection and will make your blend more noticeable.`,
      }
    }

    return { type: 'CLARIFY', prompt: 'I can\'t add any more high-projection notes without creating clashes. Your current blend already has good sillage.' }
  }

  // ── Freshness / Lightness ──────────────────────────────────────────────

  if (
    lower.includes('fresh') ||
    lower.includes('light') ||
    lower.includes('summer') ||
    lower.includes('clean') ||
    lower.includes('bright')
  ) {
    const candidate = findBestCompatibleNote(currentNoteIds, (note) => {
      return note.layer === 'top' && note.attributes.freshness >= 8
    })

    if (candidate) {
      return {
        type: 'ADD',
        noteId: candidate.id,
        reason: `${candidate.name} will brighten your blend with a fresh, clean opening.`,
      }
    }

    return { type: 'CLARIFY', prompt: 'Your blend already has fresh top notes. Adding more might make it too sharp.' }
  }

  // ── Warmth / Evening / Darker ──────────────────────────────────────────

  if (
    lower.includes('warm') ||
    lower.includes('evening') ||
    lower.includes('dark') ||
    lower.includes('sexy') ||
    lower.includes('intimate') ||
    lower.includes('cozy')
  ) {
    const candidate = findBestCompatibleNote(currentNoteIds, (note) => {
      return note.attributes.warmth >= 7
    })

    if (candidate) {
      return {
        type: 'ADD',
        noteId: candidate.id,
        reason: `${candidate.name} brings warmth and depth, perfect for evening wear.`,
      }
    }

    return { type: 'CLARIFY', prompt: 'Your blend already has warm notes. Adding more might make it too heavy.' }
  }

  // ── Sweetness / Gourmand ───────────────────────────────────────────────

  if (
    lower.includes('sweet') ||
    lower.includes('dessert') ||
    lower.includes('gourmand') ||
    lower.includes('vanilla') ||
    lower.includes('caramel')
  ) {
    const candidate = findBestCompatibleNote(currentNoteIds, (note) => {
      return (note.family === 'gourmand' || note.attributes.sweetness >= 6) && !currentNoteIds.includes(note.id)
    })

    if (candidate) {
      return {
        type: 'ADD',
        noteId: candidate.id,
        reason: `${candidate.name} adds delicious sweetness and comfort.`,
      }
    }

    return { type: 'CLARIFY', prompt: 'Your blend already has sweet notes. More might make it cloying.' }
  }

  // ── Crowd-pleasing / Wearable ──────────────────────────────────────────

  if (
    lower.includes('crowd') ||
    lower.includes('compliment') ||
    lower.includes('appeal') ||
    lower.includes('wearable') ||
    lower.includes('safe') ||
    lower.includes('versatile')
  ) {
    const candidate = findBestCompatibleNote(currentNoteIds, (note) => {
      return note.attributes.polarizing <= 3 && !currentNoteIds.includes(note.id)
    })

    if (candidate) {
      return {
        type: 'ADD',
        noteId: candidate.id,
        reason: `${candidate.name} is universally loved and will make your blend more crowd-pleasing.`,
      }
    }

    return { type: 'CLARIFY', prompt: 'Your blend is already very wearable and versatile.' }
  }

  // ── Remove note ────────────────────────────────────────────────────────

  if (lower.includes('remove') || lower.includes('take out') || lower.includes('delete')) {
    // Extract note name from message
    const noteToRemove = findNoteInMessage(message, currentNoteIds)
    
    if (noteToRemove) {
      const isAllergy = lower.includes('allerg') || lower.includes('sensitive') || lower.includes('react')
      const reason = isAllergy
        ? `Removed ${NOTES_BY_ID[noteToRemove].name}. Note: I'm an AI assistant, not a medical advisor. Please consult with a professional for allergy concerns.`
        : `Removed ${NOTES_BY_ID[noteToRemove].name} from your blend.`
      
      return { type: 'REMOVE', noteId: noteToRemove, reason }
    }

    return { type: 'CLARIFY', prompt: 'Which note would you like me to remove? Please specify the note name.' }
  }

  // ── Replace note ───────────────────────────────────────────────────────

  if (lower.includes('replace') || lower.includes('swap') || lower.includes('change')) {
    // This is complex - for now, clarify
    return { type: 'CLARIFY', prompt: 'Which note would you like to replace, and with what? For example: "Replace bergamot with yuzu"' }
  }

  // ── Default: Ambiguous ─────────────────────────────────────────────────

  return {
    type: 'CLARIFY',
    prompt: 'I can help you make your blend last longer, add freshness, increase projection, or explain how it will smell. What would you like?',
  }
}

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Find the best compatible note matching a predicate function.
 * Returns the first note that passes validation.
 */
function findBestCompatibleNote(
  currentNoteIds: string[],
  predicate: (note: typeof NOTES[0]) => boolean,
): typeof NOTES[0] | null {
  const candidates = NOTES.filter((note) => {
    if (currentNoteIds.includes(note.id)) return false
    if (!predicate(note)) return false

    const validation = validateAdd(currentNoteIds, note.id)
    return validation.ok
  })

  // Sort by attribute scores - prefer higher values
  candidates.sort((a, b) => {
    const scoreA = a.attributes.longevity + a.attributes.projection + a.attributes.intensity
    const scoreB = b.attributes.longevity + b.attributes.projection + b.attributes.intensity
    return scoreB - scoreA
  })

  return candidates[0] || null
}

/**
 * Find a note ID mentioned in the message that exists in the current blend.
 */
function findNoteInMessage(message: string, currentNoteIds: string[]): string | null {
  const lower = message.toLowerCase()

  for (const noteId of currentNoteIds) {
    const note = NOTES_BY_ID[noteId]
    if (!note) continue

    // Check if note name appears in message
    const nameLower = note.name.toLowerCase()
    if (lower.includes(nameLower)) {
      return noteId
    }

    // Check if note ID appears
    if (lower.includes(noteId)) {
      return noteId
    }

    // Check for partial matches on distinctive words
    const words = nameLower.split(/\s+/)
    if (words.length > 1) {
      // For multi-word names, check if the distinctive word appears
      // e.g., "Damask Rose" -> check for "rose"
      const distinctiveWord = words[words.length - 1]
      if (distinctiveWord.length > 4 && lower.includes(distinctiveWord)) {
        return noteId
      }
    }
  }

  return null
}
