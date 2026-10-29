/**
 * concierge.ts — Server orchestrator for concierge recommendations.
 *
 * The AI proposes directions; the application validates every note ID against
 * the local catalog, enforces exclusions absolutely, repairs bounded issues,
 * recomputes profiles with the existing scoring engine and falls back to the
 * deterministic `recommendBlends` path whenever a direction is invalid.
 */

import { FAMILY_LABELS, NOTES, NOTES_BY_ID } from '@/lib/fragrance-data'
import { buildTarget, recommendBlends } from '@/lib/concierge'
import { computeProfile } from '@/lib/scoring'
import { sanitizeNoteIds, validateAdd, validateBlend } from '@/lib/validation'
import type { ConciergeInput, ConciergeRecommendation, RecommendationTier, ScentProfile } from '@/lib/types'
import { getAiConfig, hasAnyProvider } from './config'
import { generateWithFallback } from './providers'
import { catalogAllowlist, conciergeSystemPrompt, conciergeUserPrompt, type ConciergePromptInput } from './prompts'
import { conciergeOutputSchema } from './schemas'
import { resolveAvoidEntries, type ResolvedAvoid } from './avoid'
import { fetchPerfumeInspiration, isPerfumeReference, type PerfumePickRef } from './perfume-picks'

export interface ConciergeResult {
  recommendations: ConciergeRecommendation[]
  source: 'gemini' | 'groq' | 'fallback'
  degraded?: boolean
  inspiration?: { name: string; brand: string; accords?: string[] }[]
}

const TIERS: RecommendationTier[] = ['Safe', 'Balanced', 'Bold']

function targetSummary(input: ConciergeInput, avoid: ResolvedAvoid): string {
  const target = buildTarget({ ...input, avoid: [...avoid.noteIds, ...avoid.families] })
  const parts = [
    `freshness ${target.freshness}/10`,
    `sweetness ${target.sweetness}/10`,
    `warmth ${target.warmth}/10`,
    `intensity ${target.intensity}/10`,
    `families ${target.families.map((f) => FAMILY_LABELS[f]).join(', ') || 'open'}`,
  ]
  if (target.avoidNotes.length) parts.push(`avoid notes: ${target.avoidNotes.join(', ')}`)
  if (target.avoidFamilies.length) parts.push(`avoid families: ${target.avoidFamilies.map((f) => FAMILY_LABELS[f]).join(', ')}`)
  return parts.join(', ')
}

function respectsExclusions(id: string, avoid: ResolvedAvoid): boolean {
  return (
    !avoid.noteIds.includes(id) &&
    !avoid.families.some((family) => NOTES_BY_ID[id]?.family === family)
  )
}

/**
 * A compatible stand-in for a note we must remove: same layer and family first
 * (keeps the direction's intended character), same layer second, and always a
 * curated rule alternative before a plain sibling. Must fit the remaining notes.
 */
function sameFamilyAlternative(
  victimId: string,
  remainingIds: readonly string[],
  alternatives: readonly string[],
  avoid: ResolvedAvoid,
): string | null {
  const victim = NOTES_BY_ID[victimId]
  if (!victim) return null
  const remaining = [...remainingIds]
  const evaluate = (id: string): boolean =>
    Boolean(
      NOTES_BY_ID[id] &&
        !remaining.includes(id) &&
        respectsExclusions(id, avoid) &&
        validateAdd(remaining, id).ok,
    )

  for (const id of alternatives) if (evaluate(id)) return id
  for (const note of NOTES) {
    if (note.layer === victim.layer && note.family === victim.family && evaluate(note.id)) return note.id
  }
  for (const note of NOTES) {
    if (note.layer === victim.layer && evaluate(note.id)) return note.id
  }
  return null
}

/** Enforce exclusions + clash rules on one AI-proposed direction. */
function repairDirection(direction: { noteIds: string[] }, avoid: ResolvedAvoid): string[] {
  const allowed = sanitizeNoteIds(direction.noteIds).filter(
    (id) =>
      !avoid.noteIds.includes(id) &&
      !avoid.families.some((family) => NOTES_BY_ID[id]?.family === family),
  )

  // Clash resolution: substitute the later clash partner with a compatible
  // sibling (keeps the pyramid a full one), drop it when nothing fits.
  for (let pass = 0; pass < allowed.length; pass++) {
    const check = validateBlend(allowed)
    if (check.issues.length === 0) break
    const issue = check.issues[0]
    const idxA = allowed.indexOf(issue.noteA.id)
    const idxB = allowed.indexOf(issue.noteB.id)
    if (idxA < 0 || idxB < 0) break
    const victimIdx = idxA <= idxB ? idxB : idxA
    const victimId = allowed[victimIdx]
    const remaining = allowed.filter((_, index) => index !== victimIdx)
    const substitute = sameFamilyAlternative(victimId, remaining, issue.rule.alternatives[victimId] ?? [], avoid)
    if (substitute) allowed.splice(victimIdx, 1, substitute)
    else allowed.splice(victimIdx, 1)
  }

  return validateBlend(allowed).issues.length === 0 && allowed.length >= 3 ? allowed : []
}

function deterministicTiers(input: ConciergeInput, avoid: ResolvedAvoid): ConciergeRecommendation[] {
  return recommendBlends({ ...input, avoid: [...avoid.noteIds, ...avoid.families] })
}

function deriveName(direction: { name?: string }, profile: NonNullable<ReturnType<typeof computeProfile>>): string {
  const raw = (direction.name ?? '').replace(/["“”'’]/g, '').trim()
  return (raw.length >= 2 ? raw : `${FAMILY_LABELS[profile.family]} Study`).slice(0, 40)
}

function sanitizeText(value: string, max: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

export async function runConciergeAI(preferences: ConciergeInput): Promise<ConciergeResult> {
  const avoid = resolveAvoidEntries(preferences.avoid)
  const usablePreferences: ConciergeInput = {
    ...preferences,
    avoid: [...avoid.noteIds, ...avoid.families],
  }

  const config = getAiConfig()
  if (!hasAnyProvider(config)) {
    const fallback = deterministicTiers(usablePreferences, avoid)
    return { recommendations: fallback, source: 'fallback', degraded: true }
  }

  // Optional external inspiration: bounded, cached, best-effort.
  let inspiration: PerfumePickRef[] | undefined
  const referenceText = `${preferences.mood} ${preferences.freeText}`
  if (isPerfumeReference(referenceText)) {
    const queryMatch = referenceText.match(/(?:like|similar to|inspired by|reminder of|compared to|such as)\s+([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)/)
    if (queryMatch) {
      const refs = await fetchPerfumeInspiration(queryMatch[1], 3)
      if (refs && refs.length > 0) inspiration = refs
    }
  }

  const promptInput: ConciergePromptInput = { preferences: usablePreferences, avoid, targetSummary: targetSummary(usablePreferences, avoid) }
  const inspirationBlock = inspiration?.length
    ? `\n\nExternal inspiration (Perfume Picks database — purely directional; never reuse their note names): ${inspiration
        .map((r) => `${r.brand} ${r.name}${r.accords?.length ? ` (${r.accords.join(', ')})` : ''}`)
        .join('; ')}`
    : ''

  const result = await generateWithFallback(
    { mode: 'concierge', system: conciergeSystemPrompt(), user: `${conciergeUserPrompt(promptInput)}${inspirationBlock}` },
    conciergeOutputSchema,
  )

  if (!result.ok) {
    const fallback = deterministicTiers(usablePreferences, avoid)
    return { recommendations: fallback, source: 'fallback', degraded: true, inspiration }
  }

  // ── Validate AI directions against the real catalog ──────────────────────
  const target = buildTarget(usablePreferences)
  const deterministic = deterministicTiers(usablePreferences, avoid)
  const deterministicByTier = new Map(deterministic.map((r) => [r.tier, r]))
  const usedSets: Set<string>[] = []
  const seenTiers = new Set<RecommendationTier>()

  const recommendations: ConciergeRecommendation[] = []
  let degraded = false

  for (const raw of result.data.recommendations) {
    const tier = raw.tier
    // A repeated tier is untrusted weight: only the first occurrence counts,
    // so a hallucinated extra direction can never displace another tier.
    if (seenTiers.has(tier)) {
      degraded = true
      continue
    }
    seenTiers.add(tier)

    const proposedIds = sanitizeNoteIds(raw.noteIds)
    const proposedNames = namesOfIds(proposedIds)
    const repairedIds = repairDirection(raw, avoid)
    const blendCheck = validateBlend(repairedIds)

    // Copy that names a material we had to drop would contradict the note
    // chips beneath it — such a direction goes to the deterministic tier.
    const droppedNames = proposedNames.filter((name) => !namesOfIds(repairedIds).includes(name))
    const sanitizedSummary = sanitizeText(raw.summary, 200)
    const sanitizedExplanation = sanitizeText(raw.explanation, 650)
    const copyMentionsDropped =
      droppedNames.length > 0 &&
      (mentionsAny(sanitizedSummary, droppedNames) || mentionsAny(sanitizedExplanation, droppedNames))
    // Same lie, subtler: text claiming a layer the blend does not actually
    // contain (a "drydown of sandalwood" with no base note at all). Only
    // punished together with a genuinely missing pyramid layer.
    const copyInventsMissingLayer =
      blendCheck.missingLayers.length > 0 &&
      mentionsAbsentMaterial(`${sanitizedSummary} ${sanitizedExplanation}`, repairedIds)

    const sameAsAnother = usedSets.some(
      (set) => [...set].join('|') === [...new Set(repairedIds)].sort().join('|'),
    )
    const profile = repairedIds.length ? computeProfile(repairedIds) : null

    if (
      !profile ||
      sameAsAnother ||
      overlapsWithAnother(repairedIds, usedSets) ||
      copyMentionsDropped ||
      copyInventsMissingLayer ||
      reusedOutOfBounds(repairedIds, tier) ||
      incompleteComposition(repairedIds) ||
      !fitsBrief(profile, tier, target)
    ) {
      const fallbackRec = deterministicByTier.get(tier)
      if (fallbackRec) {
        recommendations.push(applyAiCopy(fallbackRec, raw, proposedNames, namesOfIds(fallbackRec.noteIds)))
        degraded = true
        usedSets.push(new Set(fallbackRec.noteIds))
      }
      continue
    }

    const rec: ConciergeRecommendation = {
      tier,
      name: deriveName(raw, profile),
      noteIds: repairedIds,
      family: profile.family,
      summary: sanitizedSummary,
      explanation: sanitizedExplanation,
      profile,
    }
    recommendations.push(rec)
    usedSets.push(new Set(repairedIds))
  }

  // Fill any tier the model skipped or mishandled instead of discarding the
  // whole response — the AI directions that survived stay in the answer.
  for (const tier of TIERS) {
    if (recommendations.some((rec) => rec.tier === tier)) continue
    const fallbackRec = deterministicByTier.get(tier)
    if (fallbackRec) {
      recommendations.push(fallbackRec)
      degraded = true
    }
  }

  return recommendations.length === 3
    ? { recommendations: sortTiers(recommendations), source: result.provider, degraded: degraded || undefined, inspiration }
    : { recommendations: deterministic, source: 'fallback', degraded: true, inspiration }
}

const BOLD_ALLOW_MORE_POLARIZING = true

/** Catalog display names for a note-ID list (unknown IDs kept verbatim). */
function namesOfIds(ids: readonly string[]): string[] {
  return ids.map((id) => NOTES_BY_ID[id]?.name ?? id)
}

/** True when the text still names one of the given materials. */
function mentionsAny(text: string, names: readonly string[]): boolean {
  const lower = text.toLowerCase()
  return names.some((name) => lower.includes(name.toLowerCase()))
}

const CATALOG_ENTRY_TOKENS: { id: string; words: string[] }[] = catalogAllowlist().map((note) => ({
  id: note.id,
  words: note.name.toLowerCase().split(/[\s-]+/),
}))

/**
 * Conservative catalog-name scan: only entries with two or more words (or a
 * single distinctive word like "sandalwood") count, so ordinary adjectives
 * ("rose" in "scented like a rose garden", "tea"…) never trigger it.
 */
function mentionsAbsentMaterial(text: string, shippedIds: readonly string[]): boolean {
  const shipped = new Set(shippedIds)
  const tokens = new Set(text.toLowerCase().split(/[^a-z-]+/))
  for (const entry of CATALOG_ENTRY_TOKENS) {
    if (shipped.has(entry.id)) continue
    if (entry.words.length < 2 && entry.words[0].length < 6) continue
    if (entry.words.every((word) => tokens.has(word))) return true
  }
  return false
}

/**
 * Two directions should not be near-duplicates: reject a candidate whose blend
 * overlaps an accepted one on ~three quarters or more of the shared palette.
 */
function overlapsWithAnother(ids: string[], usedSets: readonly Set<string>[]): boolean {
  const candidate = new Set(ids)
  return usedSets.some((set) => {
    let shared = 0
    for (const id of set) if (candidate.has(id)) shared++
    const union = new Set([...set, ...candidate]).size
    return union > 0 && shared / union >= 0.75
  })
}

/**
 * Brief-fit gate: a direction must land near the studio-computed target
 * (freshness, sweetness, warmth, intensity). Thresholds are generous — too !=
 * the target by roughly 3+ scale points across two attributes is what begins
 * to punish; far more means the direction contradicts what the customer asked
 * for. Bold is allowed to wander.
 */
function fitsBrief(
  profile: ScentProfile,
  tier: RecommendationTier,
  target: ReturnType<typeof buildTarget>,
): boolean {
  const distance = Math.sqrt(
    (profile.freshness - target.freshness) ** 2 +
      (profile.sweetness - target.sweetness) ** 2 +
      (profile.warmth - target.warmth) ** 2 +
      (profile.intensity - target.intensity) ** 2,
  )
  const cap = tier === 'Safe' ? 7 : tier === 'Balanced' ? 9 : Number.POSITIVE_INFINITY
  return distance <= cap
}

function sortTiers(recs: ConciergeRecommendation[]): ConciergeRecommendation[] {
  return [...recs].sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier))
}

function reusedOutOfBounds(ids: string[], tier: RecommendationTier): boolean {
  // Bold may be more polarizing; Safe must stay broadly crowd-pleasing so the
  // three directions remain distinct in character, not just content.
  const notes = ids.map((id) => NOTES_BY_ID[id]).filter(Boolean)
  if (tier === 'Safe' && notes.length) {
    const avgPolarizing = notes.reduce((sum, note) => sum + note.attributes.polarizing, 0) / notes.length
    return avgPolarizing > 8
  }
  return !BOLD_ALLOW_MORE_POLARIZING && tier === 'Bold'
}

function incompleteComposition(ids: string[]): boolean {
  const check = validateBlend(ids)
  if (check.issues.length > 0) return true
  if (check.missingLayers.length > 1) return true
  return ids.length > 7
}

/**
 * Adopt the model's copy over a deterministic direction, but only while it
 * cannot contradict the notes we actually ship: text that still names a
 * proposed material that did not survive validation keeps the studio copy.
 */
function applyAiCopy(
  rec: ConciergeRecommendation,
  raw: { name?: string; summary?: string; explanation?: string },
  proposedNames: readonly string[],
  shippedNames: readonly string[],
): ConciergeRecommendation {
  const dropped = proposedNames.filter((name) => !shippedNames.includes(name))
  const name = sanitizeText(raw.name ?? '', 40)
  const summary = sanitizeText(raw.summary ?? '', 200)
  const explanation = sanitizeText(raw.explanation ?? '', 650)
  const staysConsistent = (value: string) => !mentionsAny(value, dropped)
  return {
    ...rec,
    name: name.length >= 2 ? name : rec.name,
    summary: summary.length >= 10 && staysConsistent(summary) ? summary : rec.summary,
    explanation: explanation.length >= 20 && staysConsistent(explanation) ? explanation : rec.explanation,
  }
}
