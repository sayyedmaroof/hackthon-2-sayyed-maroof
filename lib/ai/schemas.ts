/**
 * schemas.ts — Zod contracts for the shared AI endpoint and the structured
 * model outputs. The browser can only produce what these schemas accept; the
 * model output must satisfy them before any action is taken on the blend.
 *
 * Zod 4 is used here (`zod` v4.6 is the installed dependency).
 */

import { z } from 'zod'
import type { Family } from '@/lib/types'

// Must mirror lib/types.ts Family union (validated by tests).
const FAMILY_TUPLE = ['citrus', 'fresh', 'floral', 'woody', 'amber', 'spicy', 'gourmand'] as const

export const familySchema = z.enum(FAMILY_TUPLE)

// ─── Shared primitives ──────────────────────────────────────────────────────

export const concentrationSchema = z.enum(['edt', 'edp', 'parfum'])

export const tierSchema = z.enum(['Safe', 'Balanced', 'Bold'])

/** Chat history entry — output text only, no roles beyond user/assistant. */
export const historyEntrySchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1).max(500),
})

// ─── Request schemas (browser → API) ────────────────────────────────────────

// The builder itself does not hard-cap how many notes a blend can accumulate,
// so the advisor context cap must be a generous ceiling (kept low enough to
// bound prompt size) rather than an easily reachable failure.
export const MAX_ADVISOR_NOTES = 24

export const builderContextSchema = z.strictObject({
  noteIds: z.array(z.string().max(48)).max(MAX_ADVISOR_NOTES),
  concentration: concentrationSchema,
})

export const builderRequestSchema = z.strictObject({
  mode: z.literal('builder'),
  message: z.string().min(1, 'Message is empty.').max(600),
  history: z.array(historyEntrySchema).max(8).default([]),
  context: builderContextSchema,
})

export const conciergePreferencesSchema = z.strictObject({
  mood: z.string().max(160).default(''),
  occasion: z.enum(['day', 'office', 'evening', 'date', 'special']).default('evening'),
  intensity: z.enum(['subtle', 'moderate', 'bold']).optional(),
  families: z.array(familySchema).max(7).default([]),
  /** Human-readable note or family names, e.g. "vanilla", "oud". */
  avoid: z.array(z.string().min(1).max(60)).max(12).default([]),
  freeText: z.string().max(600).default(''),
})

export const conciergeRequestSchema = z.strictObject({
  mode: z.literal('concierge'),
  preferences: conciergePreferencesSchema,
})

export const aiRequestSchema = z.discriminatedUnion('mode', [
  builderRequestSchema,
  conciergeRequestSchema,
])

// ─── Model output schemas (provider → domain validation) ────────────────────

export const builderActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ADD'), noteId: z.string().min(1).max(48), reason: z.string().max(240) }),
  z.object({ type: z.literal('REMOVE'), noteId: z.string().min(1).max(48), reason: z.string().max(240) }),
  z.object({
    type: z.literal('REPLACE'),
    oldId: z.string().min(1).max(48),
    newId: z.string().min(1).max(48),
    reason: z.string().max(240),
  }),
  z.object({
    type: z.literal('SET_CONCENTRATION'),
    value: concentrationSchema,
    reason: z.string().max(240),
  }),
  z.object({ type: z.literal('EXPLAIN') }),
])

export const builderOutputSchema = z.object({
  reply: z.string().min(1).max(1200),
  actions: z.array(builderActionSchema).max(5).default([]),
})

export const conciergeDirectionSchema = z.object({
  tier: tierSchema,
  name: z.string().min(2).max(48),
  noteIds: z.array(z.string().min(1).max(48)).min(3).max(8),
  summary: z.string().min(10).max(220),
  explanation: z.string().min(20).max(700),
})

export const conciergeOutputSchema = z.object({
  recommendations: z.array(conciergeDirectionSchema).min(3).max(3),
})

// ─── Response schemas (API → browser) ───────────────────────────────────────

export type BuilderClientAction =
  | { type: 'ADD'; noteId: string; oldId?: undefined; reason: string }
  | { type: 'REMOVE'; noteId: string; oldId?: undefined; reason: string }
  | { type: 'REPLACE'; oldId: string; newId: string; noteId?: undefined; reason: string }
  | { type: 'SET_CONCENTRATION'; value: 'edt' | 'edp' | 'parfum'; reason: string }

/**
 * Validated actions safe to apply on the client. Every id refers to a real
 * catalog note and the whole set was simulated against a copy of the blend
 * server-side (`planValid`). The client re-simulates before committing.
 */
export interface BuilderApiResponse {
  ok: true
  mode: 'builder'
  reply: string
  actions: BuilderClientAction[]
  /** Server sim result for the actions (the client still re-checks). */
  planValid: boolean
  planError?: string
  source: 'gemini' | 'groq' | 'fallback'
  /** Short, product-oriented quality hint, e.g. "offline studio logic". */
  degraded?: boolean
}

export interface ConciergeApiResponse {
  ok: true
  mode: 'concierge'
  recommendations: import('@/lib/types').ConciergeRecommendation[]
  source: 'gemini' | 'groq' | 'fallback'
  degraded?: boolean
  /** Optional Perfume Picks inspiration with source attribution. */
  inspiration?: {
    name: string
    brand: string
    accords?: string[]
  }[]
}

export interface AiApiError {
  ok: false
  error: { code: string; message: string }
}

export type ApiResponse = BuilderApiResponse | ConciergeApiResponse | AiApiError
