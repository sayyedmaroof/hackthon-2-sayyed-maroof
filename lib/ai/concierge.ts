/**
 * concierge.ts — Server orchestrator for concierge recommendations.
 *
 * The AI proposes directions; the application validates every note ID against
 * the local catalog, enforces exclusions absolutely, repairs bounded issues,
 * recomputes profiles with the existing scoring engine and falls back to the
 * deterministic `recommendBlends` path whenever a direction is invalid.
 */

import { FAMILY_LABELS, NOTES_BY_ID } from '@/lib/fragrance-data'
import { buildTarget, recommendBlends } from '@/lib/concierge'
import { computeProfile } from '@/lib/scoring'
import { sanitizeNoteIds, validateBlend } from '@/lib/validation'
import type { ConciergeInput, ConciergeRecommendation, RecommendationTier } from '@/lib/types'
import { getAiConfig, hasAnyProvider } from './config'
import { generateWithFallback } from './providers'
import { conciergeSystemPrompt, conciergeUserPrompt, type ConciergePromptInput } from './prompts'
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

/** Enforce exclusions + clash rules on one AI-proposed direction. */
function repairDirection(direction: { noteIds: string[] }, avoid: ResolvedAvoid): string[] {
  const allowed = sanitizeNoteIds(direction.noteIds).filter(
    (id) =>
      !avoid.noteIds.includes(id) &&
      !avoid.families.some((family) => NOTES_BY_ID[id]?.family === family),
  )

  // Clash repair: drop the later clash partner, keep the earlier choice.
  let check = validateBlend(allowed)
  if (check.issues.length > 0) {
    const drop = new Set<string>()
    for (const issue of check.issues) {
      const idxA = allowed.indexOf(issue.noteA.id)
      const idxB = allowed.indexOf(issue.noteB.id)
      drop.add(idxA <= idxB ? issue.noteB.id : issue.noteA.id)
    }
    const repaired = allowed.filter((id) => !drop.has(id))
    check = validateBlend(repaired)
    if (check.issues.length === 0 && repaired.length >= 3) return repaired
    return []
  }

  return allowed.length >= 3 ? allowed : []
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
  const deterministic = deterministicTiers(usablePreferences, avoid)
  const deterministicByTier = new Map(deterministic.map((r) => [r.tier, r]))
  const usedSets: Set<string>[] = []

  const recommendations: ConciergeRecommendation[] = []
  let degraded = false

  for (const raw of result.data.recommendations) {
    const tier = raw.tier
    const repairedIds = repairDirection(raw, avoid)
    const sameAsAnother = usedSets.some(
      (set) => [...set].join('|') === [...new Set(repairedIds)].sort().join('|'),
    )
    const profile = repairedIds.length ? computeProfile(repairedIds) : null

    if (!profile || reusedOutOfBounds(repairedIds, tier) || sameAsAnother || incompleteComposition(repairedIds)) {
      const fallbackRec = deterministicByTier.get(tier)
      if (fallbackRec) {
        recommendations.push(applyAiCopy(fallbackRec, raw))
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
      summary: sanitizeText(raw.summary, 200),
      explanation: sanitizeText(raw.explanation, 650),
      profile,
    }
    recommendations.push(rec)
    usedSets.push(new Set(repairedIds))
  }

  return recommendations.length === 3
    ? { recommendations: sortTiers(recommendations), source: result.provider, degraded: degraded || undefined, inspiration }
    : { recommendations: deterministic, source: 'fallback', degraded: true, inspiration }
}

const BOLD_ALLOW_MORE_POLARIZING = true

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

function applyAiCopy(
  rec: ConciergeRecommendation,
  raw: { name?: string; summary?: string; explanation?: string },
): ConciergeRecommendation {
  const profile = rec.profile
  const name = sanitizeText(raw.name ?? '', 40)
  const summary = sanitizeText(raw.summary ?? '', 200)
  const explanation = sanitizeText(raw.explanation ?? '', 650)
  return {
    ...rec,
    name: name.length >= 2 ? name : rec.name,
    summary: summary.length >= 10 ? summary : rec.summary,
    explanation: explanation.length >= 20 ? explanation : rec.explanation,
    profile,
  }
}
