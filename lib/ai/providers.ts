/**
 * providers.ts — Provider-independent JSON generation.
 *
 * Gemini (via @google/genai) is the primary provider; Groq (groq-sdk) takes
 * over exactly once on an eligible transient failure. Results are validated
 * upstream with the same zod schemas regardless of provider, so a fallback
 * can never loosen domain rules.
 */

import { GoogleGenAI } from '@google/genai'
import Groq from 'groq-sdk'
import { getAiConfig, providerChain, type ProviderName } from './config'
import { AiError, normalizeProviderError } from './errors'
import { BUILDER_FORMAT_REMINDER, CONCIERGE_FORMAT_REMINDER } from './prompts'
import type { ZodType } from 'zod'

export interface GenerateParams {
  mode: 'builder' | 'concierge'
  system: string
  user: string
}

export interface GenerateSuccess<T> {
  ok: true
  provider: ProviderName
  data: T
}

export interface GenerateFailure {
  ok: false
}

export type GenerateResult<T> = GenerateSuccess<T> | GenerateFailure

// ─── Structured schemas for each provider ───────────────────────────────────

const GEMINI_SCHEMA_BUILDER = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    actions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['ADD', 'REMOVE', 'REPLACE', 'SET_CONCENTRATION', 'EXPLAIN'] },
          noteId: { type: 'STRING' },
          oldId: { type: 'STRING' },
          newId: { type: 'STRING' },
          value: { type: 'STRING', enum: ['edt', 'edp', 'parfum'] },
          reason: { type: 'STRING' },
        },
        required: ['type'],
      },
    },
  },
  required: ['reply', 'actions'],
} as const

const GEMINI_SCHEMA_CONCIERGE = {
  type: 'OBJECT',
  properties: {
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          tier: { type: 'STRING', enum: ['Safe', 'Balanced', 'Bold'] },
          name: { type: 'STRING' },
          noteIds: { type: 'ARRAY', items: { type: 'STRING' } },
          summary: { type: 'STRING' },
          explanation: { type: 'STRING' },
        },
        required: ['tier', 'name', 'noteIds', 'summary', 'explanation'],
      },
    },
  },
  required: ['recommendations'],
} as const

function expectedShape(mode: 'builder' | 'concierge'): string {
  return mode === 'builder' ? BUILDER_FORMAT_REMINDER : CONCIERGE_FORMAT_REMINDER
}

/**
 * Builder edits demand precision (bad actions get dropped server-side, which
 * wastes the request), while concierge copy benefits from more latitude.
 */
const TEMPERATURE_BY_MODE: Record<GenerateParams['mode'], number> = {
  builder: 0.55,
  concierge: 0.75,
}

// ─── Provider calls ─────────────────────────────────────────────────────────

async function callGemini(params: GenerateParams, model: string, maxOutputTokens: number): Promise<string> {
  const config = getAiConfig()
  if (!config.geminiApiKey) {
    throw new AiError('missing_key', 'Gemini is not configured.', { detail: 'GEMINI_API_KEY missing' })
  }
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: params.user }] }],
      config: {
        systemInstruction: params.system,
        responseMimeType: 'application/json',
        responseSchema: params.mode === 'builder' ? GEMINI_SCHEMA_BUILDER : GEMINI_SCHEMA_CONCIERGE,
        maxOutputTokens,
        temperature: TEMPERATURE_BY_MODE[params.mode],
        abortSignal: controller.signal,
      },
    })
    const text = response.text
    if (!text || !text.trim()) {
      throw new AiError('bad_output', 'The model returned an empty answer.', {
        retryable: true,
        detail: 'gemini empty text',
      })
    }
    return text
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Groq quirk: their JSON-mode validator rejects the reasoning stream that
 * gpt-oss models emit (error code `json_validate_failed`, empty
 * `failed_generation`). Detect it so we can retry once in plain mode — the
 * prompt itself already dictates the JSON shape.
 */
function isGroqJsonValidateError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('json_validate_failed')
}

async function callGroq(params: GenerateParams, model: string, maxOutputTokens: number): Promise<string> {
  const config = getAiConfig()
  if (!config.groqApiKey) {
    throw new AiError('missing_key', 'Groq is not configured.', { detail: 'GROQ_API_KEY missing' })
  }
  const groq = new Groq({ apiKey: config.groqApiKey, timeout: config.timeoutMs * 2, maxRetries: 0 })

  // Reasoning models (gpt-oss) spend completion tokens on hidden reasoning
  // before any visible JSON, so Groq gets a token floor high enough that the
  // payload itself is never truncated mid-object.
  const tokenBudget = Math.max(maxOutputTokens, 8192)
  // Reasoning effort low keeps the visible answer well inside the budget and
  // makes the fallback call roughly as fast as the primary.
  const reasoningOptions = model.toLowerCase().includes('gpt-oss') ? { reasoning_effort: 'low' as const } : {}

  const create = (jsonMode: boolean) =>
    groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: `${params.user}\n\n${expectedShape(params.mode)}` },
      ],
      ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
      temperature: TEMPERATURE_BY_MODE[params.mode],
      max_completion_tokens: tokenBudget,
      ...reasoningOptions,
    })

  let completion: Awaited<ReturnType<typeof create>>
  try {
    completion = await create(true)
  } catch (error) {
    if (!isGroqJsonValidateError(error)) throw error
    // One bounded retry without JSON mode; anything failing here is a real
    // provider problem and propagates to the normal failover classification.
    completion = await create(false)
  }

  const text = completion.choices[0]?.message?.content ?? ''
  if (!text.trim()) {
    throw new AiError('bad_output', 'The model returned an empty answer.', {
      retryable: true,
      detail: 'groq empty text',
    })
  }
  return text
}

function providerCall(provider: ProviderName, params: GenerateParams, maxOutputTokens: number): Promise<string> {
  const config = getAiConfig()
  if (provider === 'gemini') return callGemini(params, config.geminiModel, maxOutputTokens)
  return callGroq(params, config.groqModel, maxOutputTokens)
}

// ─── Orchestration ──────────────────────────────────────────────────────────

/**
 * Extract the first balanced top-level `{ ... }` block, string-aware. Used as
 * a last resort when the response contains reasoning preamble or trailing
 * commentary around the JSON payload the prompt asked for.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function parseJsonText(raw: string): unknown {
  // Defensive: strip accidental code fences if a provider adds them.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try {
    return JSON.parse(cleaned)
  } catch (error) {
    // Lenient recovery: reasoning models may wrap the JSON object in
    // explanation text (especially when JSON mode had to be disabled).
    const candidate = extractJsonObject(cleaned)
    if (candidate) {
      try {
        return JSON.parse(candidate)
      } catch {
        // fall through to the structured error below
      }
    }
    throw new AiError('bad_output', 'The model returned a malformed answer.', {
      retryable: true,
      detail: `JSON.parse failed: ${error instanceof Error ? error.message : 'unknown'}`,
    })
  }
}

async function tryProvider<T>(
  provider: ProviderName,
  params: GenerateParams,
  schema: ZodType<T>,
  maxOutputTokens: number,
): Promise<T> {
  let raw: string
  try {
    raw = await providerCall(provider, params, maxOutputTokens)
  } catch (error) {
    throw normalizeProviderError(error, provider)
  }
  const parsed = parseJsonText(raw)
  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new AiError('bad_output', 'The model returned an answer that failed validation.', {
      retryable: true,
      // Keep log detail compact and content-free.
      detail: `${provider} schema issues: ${result.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    })
  }
  return result.data
}

/**
 * Run the provider chain: primary first; a single fallback attempt only on
 * eligible (retryable) failures. Output is validated identically for both.
 * `null` means no provider available/valid — callers fall back to
 * deterministic logic.
 */
export async function generateWithFallback<T>(
  params: GenerateParams,
  schema: ZodType<T>,
): Promise<GenerateResult<T>> {
  const config = getAiConfig()
  const chain = providerChain(config)
  if (chain.length === 0) return { ok: false }

  let lastError: AiError | null = null
  for (const provider of chain) {
    const available = provider === 'gemini' ? config.geminiApiKey : config.groqApiKey
    if (!available) continue
    try {
      const data = await tryProvider(provider, params, schema, config.maxOutputTokens)
      return { ok: true, provider, data }
    } catch (error) {
      const aiError = error instanceof AiError ? error : normalizeProviderError(error, provider)
      lastError = aiError
      // Log every attempt, not only the last — the losing provider matters
      // when diagnosing failover (e.g. Gemini 429 → Groq json_validate).
      console.error(
        `[ai] provider attempt failed; provider=${provider} code=${aiError.code}${aiError.detail ? ` detail=${aiError.detail}` : ''}`,
      )
      // Permanent problems stop here; transient ones may use the fallback.
      if (!aiError.retryable || aiError.code === 'missing_key') break
    }
  }

  if (lastError) {
    console.error(
      `[ai] request failed; providers=${chain.join(' → ')} code=${lastError.code}`,
    )
  }
  return { ok: false }
}
