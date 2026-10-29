/**
 * plan.ts — Pure simulation of an assistant change set against a blend.
 *
 * Every proposed change is validated with the same domain rules the builder
 * uses, against a COPY of the current composition. Nothing here mutates real
 * state; callers (studio store, AI orchestrator, tests) commit only when the
 * full plan simulates cleanly — applying a plan is atomic by construction.
 */

import { NOTES_BY_ID } from '@/lib/fragrance-data'
import type { Concentration, FragranceNote, BlendWarning } from '@/lib/types'
import { validateAdd, validateBlend } from '@/lib/validation'

export type PlanAction =
  | { type: 'ADD'; noteId: string; reason: string }
  | { type: 'REMOVE'; noteId: string; reason: string }
  | { type: 'REPLACE'; oldId: string; newId: string; reason: string }
  | { type: 'SET_CONCENTRATION'; value: Concentration; reason: string }

export interface PlanStepOk {
  action: PlanAction
  ok: true
  label: string
}

export interface PlanStepFail {
  action: PlanAction
  ok: false
  message: string
  alternatives: FragranceNote[]
}

export type PlanStep = PlanStepOk | PlanStepFail

export interface PlanSimulation {
  /** Every step valid AND no clash issues in the resulting blend. */
  ok: boolean
  finalIds: string[]
  finalConcentration: Concentration
  steps: PlanStep[]
  /** None of the actions touched the composition (pure explanation). */
  noChanges: boolean
  warnings: BlendWarning[]
}

const MAX_PLAN_ACTIONS = 5

export function simulatePlan(
  currentIds: readonly string[],
  currentConcentration: Concentration,
  incomingActions: readonly PlanAction[],
): PlanSimulation {
  const ids = [...currentIds]
  let concentration = currentConcentration
  const steps: PlanStep[] = []
  const actions = incomingActions.slice(0, MAX_PLAN_ACTIONS)

  for (const action of actions) {
    if (action.type === 'ADD') {
      const result = validateAdd(ids, action.noteId)
      if (result.ok) {
        ids.push(action.noteId)
        steps.push({ action, ok: true, label: `Add ${result.note.name}` })
      } else {
        steps.push({ action, ok: false, message: result.message, alternatives: result.alternatives })
        // Stop at the first invalid step: the plan as proposed can never be
        // committed, so later steps would only describe a blend the user was
        // never offered. Repairing callers drop the bad step and re-simulate.
        break
      }
    } else if (action.type === 'REMOVE') {
      if (!ids.includes(action.noteId)) {
        const name = NOTES_BY_ID[action.noteId]?.name ?? action.noteId
        steps.push({
          action,
          ok: false,
          message: `${name} is not part of the current blend.`,
          alternatives: [],
        })
        break
      } else {
        const name = NOTES_BY_ID[action.noteId]?.name ?? action.noteId
        ids.splice(ids.indexOf(action.noteId), 1)
        steps.push({ action, ok: true, label: `Remove ${name}` })
      }
    } else if (action.type === 'REPLACE') {
      if (!ids.includes(action.oldId)) {
        const name = NOTES_BY_ID[action.oldId]?.name ?? action.oldId
        steps.push({ action, ok: false, message: `${name} is not part of the current blend.`, alternatives: [] })
        break
      } else {
        const withoutOld = ids.filter((id) => id !== action.oldId)
        const result = validateAdd(withoutOld, action.newId)
        if (result.ok) {
          ids.splice(ids.indexOf(action.oldId), 1)
          ids.push(action.newId)
          const oldName = NOTES_BY_ID[action.oldId]?.name ?? action.oldId
          steps.push({ action, ok: true, label: `Replace ${oldName} with ${result.note.name}` })
        } else {
          steps.push({ action, ok: false, message: result.message, alternatives: result.alternatives })
          break
        }
      }
    } else if (action.type === 'SET_CONCENTRATION') {
      if (action.value === concentration) continue
      concentration = action.value
      const label: Record<Concentration, string> = {
        edt: 'Eau de Toilette',
        edp: 'Eau de Parfum',
        parfum: 'Extrait de Parfum',
      }
      steps.push({ action, ok: true, label: `Concentration → ${label[action.value]}` })
    }
  }

  const blendCheck = validateBlend(ids, concentration)

  // Clash issues are blocking; completeness is reported but not blocking —
  // users may intentionally remove a layer to rebuild it.
  const clashFree = blendCheck.issues.length === 0
  const compositionChanged = ids.join(',') !== currentIds.join(',') || concentration !== currentConcentration

  return {
    ok: clashFree && steps.every((s) => s.ok),
    finalIds: ids,
    finalConcentration: concentration,
    steps,
    noChanges: !compositionChanged,
    warnings: compositionChanged ? blendCheck.warnings.slice(0, 3) : [],
  }
}
