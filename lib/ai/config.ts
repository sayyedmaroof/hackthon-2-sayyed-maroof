/**
 * config.ts — Server-only AI layer configuration.
 *
 * All values come from environment variables. The two mandatory secrets are
 * already required by the product (`GEMINI_API_KEY`, `GROQ_API_KEY`); every
 * other knob degrades to a sensible default so no extra setup is needed.
 *
 * Model defaults were verified against the live provider APIs:
 *  - Gemini: `gemini-3.5-flash` supports structured `responseSchema` output.
 *    (`gemini-2.5-flash` is retired for new accounts — do not use.)
 *  - Groq:   `openai/gpt-oss-120b` is a current chat model available to the
 *    configured account (verified via /openai/v1/models).
 */

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash'
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'
const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_ITINERARY_MAX_TOKENS = 4_096

function readInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export type ProviderName = 'gemini' | 'groq'

export interface AiConfig {
  geminiApiKey: string | null
  groqApiKey: string | null
  /** Primary provider for every request. Gemini per product decision. */
  primary: ProviderName
  geminiModel: string
  groqModel: string
  timeoutMs: number
  /** Upper bound for model output tokens (thinking tokens included). */
  maxOutputTokens: number
}

let cached: AiConfig | null = null

export function getAiConfig(): AiConfig {
  if (cached) return cached
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || null
  const groqApiKey = process.env.GROQ_API_KEY?.trim() || null
  const requested = (process.env.AI_PROVIDER?.trim().toLowerCase() as ProviderName | undefined) ?? 'gemini'
  cached = {
    geminiApiKey,
    groqApiKey,
    primary: requested === 'groq' ? 'groq' : 'gemini',
    geminiModel: process.env.AI_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    groqModel: process.env.AI_GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL,
    timeoutMs: Math.min(25_000, readInt(process.env.AI_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)),
    maxOutputTokens: Math.min(16_384, readInt(process.env.AI_MAX_OUTPUT_TOKENS, DEFAULT_ITINERARY_MAX_TOKENS)),
  }
  return cached
}

/** Provider chain for a request: primary first, then the other provider if configured. */
export function providerChain(config: AiConfig): ProviderName[] {
  const chain = [config.primary]
  const other: ProviderName = config.primary === 'gemini' ? 'groq' : 'gemini'
  if ((other === 'gemini' ? config.geminiApiKey : config.groqApiKey) && !chain.includes(other)) {
    chain.push(other)
  }
  return chain
}

/** Test hook: re-read environment on the next getAiConfig() call. */
export function resetAiConfig(): void {
  cached = null
}

export function hasAnyProvider(config: AiConfig): boolean {
  return Boolean(config.geminiApiKey || config.groqApiKey)
}
