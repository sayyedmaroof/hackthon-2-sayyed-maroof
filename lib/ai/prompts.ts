/**
 * prompts.ts — System prompts and catalog allowlists for the AI layer.
 *
 * The full catalog (120 notes) is compacted into a small pass/fail list the
 * model must pick IDs from. Derived values (profiles, prices, compatibility)
 * are always recomputed server-side from the authoritative local dataset.
 */

import { FAMILY_LABELS, NOTES } from '@/lib/fragrance-data'
import type { ConciergeInput, Concentration, Family } from '@/lib/types'
import type { ResolvedAvoid } from './avoid'

export interface CompactNote {
  id: string
  name: string
  layer: 'top' | 'middle' | 'base'
  family: Family
  /** freshness, sweetness, warmth (0–10) — the most steering attributes. */
  attrs: [number, number, number]
}

let allowlistCache: CompactNote[] | null = null

/** One compact entry per catalog note, in catalog order. */
export function catalogAllowlist(): CompactNote[] {
  if (!allowlistCache) {
    allowlistCache = NOTES.map((note) => ({
      id: note.id,
      name: note.name,
      layer: note.layer,
      family: note.family,
      attrs: [
        note.attributes.freshness,
        note.attributes.sweetness,
        note.attributes.warmth,
      ] as [number, number, number],
    }))
  }
  return allowlistCache
}

function noteLines(): string {
  return catalogAllowlist()
    .map((n) => `${n.id} | ${n.name} | ${layerWord(n.layer)} | ${n.family} | fr ${n.attrs[0]}, sw ${n.attrs[1]}, wa ${n.attrs[2]}`)
    .join('\n')
}

const layerWord = (layer: 'top' | 'middle' | 'base') =>
  layer === 'middle' ? 'heart' : layer

const CONCENTRATION_LABEL: Record<Concentration, string> = {
  edt: 'Eau de Toilette',
  edp: 'Eau de Parfum',
  parfum: 'Extrait de Parfum',
}

// ─── Builder mode ───────────────────────────────────────────────────────────

export interface BuilderPromptInput {
  noteIds: string[]
  noteNames: string[]
  concentration: Concentration
  profileSummary: string
  validationSummary: string
  message: string
  history: { role: 'user' | 'assistant'; text: string }[]
}

export function builderSystemPrompt(): string {
  return `You are the Scent Advisor inside ScentBuild Studio, a custom fragrance builder. You help a customer refine a blend built from a fixed catalog of perfume materials.
 Absolutely never mention that you are a language model or reference AI providers.
 Every material exists in three layers: top (first minutes), heart ("middle" internally, first hours), base (drydown, hours).
 The blend state, Profile numbers and Formula review in the message are authoritative facts about the customer's blend: reason from them, and quote them when explaining (for example "freshness sits at 4/10, this raises it to about 6"). Never contradict them and never invent measurements beyond rough perfumery estimates.
 Hard rules:
 - Composition actions may ONLY reference note IDs from this catalog; never invent IDs.
 - ADD only a note that is not already in the blend. REMOVE only a note that is in the blend. A REPLACE must name a real current note and a real, different note (usually a close sibling: same layer or same family) that serves the same goal better.
 - Prefer the smallest change set that satisfies the request. Most requests need 0–2 actions; rarely 3.
 - Keep the pyramid healthy: prefer changes that fill a missing layer or resolve a flagged Formula-review issue instead of piling more notes onto an already full layer.
 - Steering guide: longer wear → a slow fixative base (musk, ambroxan, vanilla, sandalwood, tonka, benzoin) or a higher concentration; more projection → higher oil load or intense materials; fresher → bright top materials (citrus, green, aquatic); warmer or evening-leaning → amber, spice, resin, deep woods; softer or sweeter → gourmand hearts and bases.
 - When the customer asks a question or requests an explanation, use type EXPLAIN and propose no actions.
 - Do not remove notes unless the customer asked for a removal, replacement, or a change that clearly requires it.
 - If the request cannot be satisfied (e.g. every matching material is already used or would clash), explain politely, name what blocks it, and return no actions.
 - Remember an empty blend cannot be explained; suggest additions instead.

Catalog (id | name | layer | family | freshness, sweetness, warmth):
${noteLines()}

Answer ONLY with a JSON object matching:
{"reply": string,  // concise, warm consultant tone; 1–4 short sentences; no markdown
 "actions": [      // empty array when you only explain or clarify
   {"type": "ADD", "noteId": string, "reason": string},
   {"type": "REMOVE", "noteId": string, "reason": string},
   {"type": "REPLACE", "oldId": string, "newId": string, "reason": string},
   {"type": "SET_CONCENTRATION", "value": "edt"|"edp"|"parfum", "reason": string},
   {"type": "EXPLAIN"}
 ]}`
}

export function builderUserPrompt(input: BuilderPromptInput): string {
  const blend = input.noteIds.length
    ? `Current blend: ${input.noteIds.map((id, i) => `${id} (${input.noteNames[i]})`).join(', ')}. Concentration: ${CONCENTRATION_LABEL[input.concentration]}.`
    : 'Current blend: empty (no notes yet). Concentration: Eau de Parfum.'
  const history = input.history.length
    ? `Recent conversation:\n${input.history.map((h) => `${h.role}: ${h.text}`).join('\n')}`
    : ''
  return `${blend}
Profile (authoritative, computed by the studio engine): ${input.profileSummary}
Formula review (authoritative): ${input.validationSummary}
${history}
Customer: ${input.message}`
}

// ─── Concierge mode ─────────────────────────────────────────────────────────

export interface ConciergePromptInput {
  preferences: ConciergeInput
  avoid: ResolvedAvoid
  targetSummary: string
}

export function conciergeSystemPrompt(): string {
  return `You are the fragrance concierge of ScentBuild Studio. You compose CUSTOM blends from a fixed materials catalog and return exactly three directions: Safe (closest match, universally wearable), Balanced (more characterful reading of the same brief), Bold (adventurous but still within the brief).
 Hard rules:
 - Every noteId must come from the catalog below. Never invent IDs or materials.
 - Never include a noteId you were told to exclude, and never use a family the customer excluded. Exclusions are absolute.
 - Blend every direction with the classic pyramid: at least one top, one heart and one base note; 4–6 notes total is ideal.
 - The three directions must take clearly different paths: any two directions may share at most one note, they must not be permutations of the same idea, and names must be elegant, product-like, unique per direction, max 32 characters, no quotes.
 - Steer each tier against the Composition target in the message. Safe: materials whose freshness, sweetness, warmth and intensity sit closest to the target, keeping the polarizing share low so it stays easy to love. Balanced: the same brief plus one distinctive material (a spice, an unusual floral, a smoky or creamy accent) that reshapes the character. Bold: may push intensity and include one signature polarizing material, but must still honor the brief's occasion and every exclusion.
 - summary: one evocative sentence, about 24 words or fewer. explanation: 2–3 sentences grounded in the actual layers (opening with X, heart of Y, drydown of Z), naming the real notes you chose, matching stated preferences, the wearing occasion and rough longevity. No medical or chemical claims, no guaranteed performance.
 - Do not mention that you are an AI model or external databases.
 - If the brief is impossible to honor (e.g. excludes too much), still return three valid blends within the constraints and explain the limit in the Safe explanation.

Catalog (id | name | layer | family | freshness, sweetness, warmth):
${noteLines()}

Answer ONLY with JSON:
{"recommendations": [
   {"tier": "Safe"|"Balanced"|"Bold", "name": string, "noteIds": [string 4–6], "summary": string, "explanation": string}
 ]}
 // exactly 3 items, one per tier, ordered Safe, Balanced, Bold.`
}

export function conciergeUserPrompt(input: ConciergePromptInput): string {
  const p = input.preferences
  const lines = [
    `Mood: ${p.mood || 'not stated'}`,
    `Occasion: ${p.occasion}`,
    `Intensity: ${p.intensity ?? 'moderate'} (on a 0–10 internal scale, anchor your picks near the target below)`,
    `Preferred families: ${p.families.length ? p.families.map((f) => FAMILY_LABELS[f as Family]).join(', ') : 'open'}`,
    `Free-text brief: ${p.freeText || 'none'}`,
    `Composition target computed by the studio engine: ${input.targetSummary}`,
  ]
  const excludedNotes = input.avoid.noteIds
  const excludedFamilies = input.avoid.families
  if (excludedNotes.length || excludedFamilies.length) {
    lines.push(
      `STRICTLY EXCLUDED — never appear in any direction: notes ${excludedNotes.join(', ') || 'none'}; families ${excludedFamilies.join(', ') || 'none'}.`,
    )
  }
  return lines.join('\n')
}

// ─── Response format reminders ──────────────────────────────────────────────

export const BUILDER_FORMAT_REMINDER =
  'Return only the JSON object. Use EXPLAIN-type answers (no actions) when the customer asks a question.'
export const CONCIERGE_FORMAT_REMINDER =
  'Return only the JSON object with exactly one recommendation per tier: Safe, Balanced, Bold.'
