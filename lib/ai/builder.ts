/**
 * builder.ts — Server orchestrator for builder (Scent Advisor) requests.
 *
 * Domain logic is authoritative: note data is resolved from the local
 * catalog, actions are simulated server-side, and the deterministic
 * `resolveIntent`/`answerScentQuestion` pair remains the local fallback.
 */

import { NOTES_BY_ID } from '@/lib/fragrance-data'
import { answerScentQuestion } from '@/lib/concierge'
import { resolveIntent } from '@/lib/assistant'
import { computeProfile, longevityHours } from '@/lib/scoring'
import { sanitizeNoteIds, validateBlend } from '@/lib/validation'
import type { Concentration } from '@/lib/types'
import { getAiConfig, hasAnyProvider } from './config'
import { generateWithFallback } from './providers'
import { builderSystemPrompt, builderUserPrompt, type BuilderPromptInput } from './prompts'
import { builderActionSchema, builderOutputSchema, type BuilderClientAction } from './schemas'
import { simulatePlan, type PlanAction } from './plan'
import type { z } from 'zod'

type RawBuilderAction = z.infer<typeof builderActionSchema>

const MAX_HISTORY = 6

export interface BuilderInput {
  message: string
  history: { role: 'user' | 'assistant'; text: string }[]
  context: { noteIds: string[]; concentration: Concentration }
}

export interface BuilderResult {
  reply: string
  actions: BuilderClientAction[]
  planValid: boolean
  planError?: string
  source: 'gemini' | 'groq' | 'fallback'
  degraded?: boolean
}

function profileSummary(ids: string[], concentration: Concentration): string {
  const profile = computeProfile(ids, concentration)
  if (!profile) return 'The blend is empty — describe or add opening materials.'
  const top2 = profile.familyMix.slice(0, 2).map((m) => `${m.family} ${Math.round(m.share * 100)}%`).join(', ')
  return `${profile.family}-led (${top2}), character ${profile.character}, freshness ${profile.freshness}/10, sweetness ${profile.sweetness}/10, warmth ${profile.warmth}/10, intensity ${profile.intensity}/10, longevity ${profile.longevity}/10 (~${longevityHours(profile.longevity)}), projection ${profile.projection}/10, crowd appeal ${profile.crowdAppeal}/10 at ${concentration.toUpperCase()}.`
}

function validationSummary(ids: string[], concentration: Concentration): string {
  const check = validateBlend(ids, concentration)
  const parts: string[] = []
  if (check.missingLayers.length) {
    parts.push(`missing ${check.missingLayers.map(layerWord).join(' and ')} layer`)
  }
  if (check.issues.length) {
    parts.push(`clash: ${check.issues[0].rule.reason}`)
  }
  if (check.warnings.length) {
    parts.push(`advisory: ${check.warnings[0].message.slice(0, 160)}`)
  }
  return parts.length ? parts.join('; ') : 'no clashes, all layers present.'
}

const layerWord = (layer: 'top' | 'middle' | 'base') =>
  layer === 'middle' ? 'heart' : layer

/** Validate + simulate the model's actions; drop steps that break the rules. */
function sanitizeActions(
  raw: readonly RawBuilderAction[],
  ids: readonly string[],
  concentration: Concentration,
): { actions: BuilderClientAction[]; planValid: boolean; planError?: string } {
  const allowedIds = new Set(Object.keys(NOTES_BY_ID))
  const planActions: PlanAction[] = []
  for (const a of raw) {
    if (a.type === 'EXPLAIN') continue
    if (a.type === 'ADD' || a.type === 'REMOVE') {
      if (!allowedIds.has(a.noteId)) continue
      planActions.push({ type: a.type, noteId: a.noteId, reason: a.reason })
    } else if (a.type === 'REPLACE') {
      if (!allowedIds.has(a.oldId) || !allowedIds.has(a.newId)) continue
      planActions.push({ type: 'REPLACE', oldId: a.oldId, newId: a.newId, reason: a.reason })
    } else if (a.type === 'SET_CONCENTRATION') {
      planActions.push({ type: 'SET_CONCENTRATION', value: a.value, reason: a.reason })
    }
  }

  const sim = simulatePlan(ids, concentration, planActions)
  if (sim.ok) {
    return { actions: planActions as unknown as BuilderClientAction[], planValid: true }
  }

  // Repair: drop the steps that broke validation and re-simulate the rest.
  const working = [...planActions]
  for (const step of sim.steps) {
    if (!step.ok) {
      const index = working.indexOf(step.action)
      if (index >= 0) working.splice(index, 1)
    }
  }
  const repair = simulatePlan(ids, concentration, working)
  if (repair.ok && working.length > 0) {
    return { actions: working as unknown as BuilderClientAction[], planValid: true }
  }
  const firstFailure = repair.steps.find((step) => !step.ok) ?? sim.steps.find((step) => !step.ok)
  return {
    actions: [],
    planValid: false,
    planError: firstFailure && !firstFailure.ok ? firstFailure.message : 'The suggested change would make the blend incoherent.',
  }
}

/** Deterministic answer when no provider succeeds. Never null unless empty blend. */
function deterministicBuilderAnswer(input: BuilderInput, ids: string[], concentration: Concentration): BuilderResult {
  const action = resolveIntent(input.message, ids)
  let reply: string
  let actions: BuilderClientAction[] = []
  let planValid = true

  if (action.type === 'EXPLAIN') {
    const answer = answerScentQuestion(ids, input.message)
    reply = answer.answer
  } else if (action.type === 'CLARIFY') {
    reply = action.prompt
  } else if (action.type === 'NONE') {
    reply = 'I can refine your blend — try "make it last longer", "add freshness" or "explain this blend".'
  } else if (action.type === 'SET_CONCENTRATION') {
    reply = action.reason
    actions = [{ type: 'SET_CONCENTRATION', value: action.value, reason: action.reason }]
  } else {
    reply = action.reason
    if (action.type === 'ADD') {
      actions = [{ type: 'ADD', noteId: action.noteId, reason: action.reason }]
    } else if (action.type === 'REMOVE') {
      actions = [{ type: 'REMOVE', noteId: action.noteId, reason: action.reason }]
    } else {
      actions = [{ type: 'REPLACE', oldId: action.oldId, newId: action.newId, reason: action.reason }]
    }
    const sim = simulatePlan(ids, concentration, actions as unknown as PlanAction[])
    if (!sim.ok) {
      actions = []
      planValid = false
      reply = `${reply}\n\nThat change does not fit your current formula, so I left the blend untouched.`
    }
  }

  return { reply, actions, planValid, source: 'fallback', degraded: true }
}

export async function runBuilderAI(input: BuilderInput): Promise<BuilderResult> {
  const ids = sanitizeNoteIds(input.context.noteIds).slice(0, 6)
  const concentration = input.context.concentration
  const noteNames = ids.map((id) => NOTES_BY_ID[id]?.name ?? id)
  const history = input.history
    .filter((h) => h.text.trim().length > 0)
    .slice(-MAX_HISTORY)
    .map((h) => ({ role: h.role, text: h.text.slice(0, 400) }))

  const promptInput: BuilderPromptInput = {
    noteIds: ids,
    noteNames,
    concentration,
    profileSummary: profileSummary(ids, concentration),
    validationSummary: validationSummary(ids, concentration),
    message: input.message.slice(0, 600),
    history,
  }

  const config = getAiConfig()
  if (!hasAnyProvider(config)) {
    return deterministicBuilderAnswer(input, ids, concentration)
  }

  const result = await generateWithFallback(
    { mode: 'builder', system: builderSystemPrompt(), user: builderUserPrompt(promptInput) },
    builderOutputSchema,
  )

  if (!result.ok) {
    return deterministicBuilderAnswer(input, ids, concentration)
  }

  const sanitized = sanitizeActions(result.data.actions, ids, concentration)
  return {
    reply: result.data.reply.slice(0, 1200),
    actions: sanitized.actions,
    planValid: sanitized.planValid,
    planError: sanitized.planError,
    source: result.provider,
  }
}
