/**
 * Provider-layer tests with fully mocked SDK clients — no real API traffic,
 * no quotas consumed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { builderOutputSchema } from '@/lib/ai/schemas'
import { resetAiConfig } from '@/lib/ai/config'
import { generateWithFallback } from '@/lib/ai/providers'

const mocks = vi.hoisted(() => ({
  geminiGenerate: vi.fn(),
  groqCreate: vi.fn(),
}))

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mocks.geminiGenerate }
  },
}))

vi.mock('groq-sdk', () => ({
  default: class {
    chat = { completions: { create: mocks.groqCreate } }
  },
}))
const BUILDER_SCHEMA = builderOutputSchema

function geminiReply(payload: unknown) {
  return { text: typeof payload === 'string' ? payload : JSON.stringify(payload) }
}
function groqReply(payload: unknown) {
  return {
    choices: [
      { message: { content: typeof payload === 'string' ? payload : JSON.stringify(payload) } },
    ],
  }
}

const PARAMS = {
  mode: 'builder' as const,
  system: 'system',
  user: 'user message about fragrance',
}

const VALID_BUILDER = { reply: 'Adding musk will anchor the drydown.', actions: [] }

describe('provider configuration', () => {
  beforeEach(() => {
    resetAiConfig()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    mocks.geminiGenerate.mockReset()
    mocks.groqCreate.mockReset()
    vi.restoreAllMocks()
    delete process.env.GEMINI_API_KEY
    delete process.env.GROQ_API_KEY
    delete process.env.AI_PROVIDER
  })

  it('1. reports no providers when keys are missing', async () => {
    const result = await generateWithFallback(PARAMS, BUILDER_SCHEMA)
    expect(result.ok).toBe(false)
    expect(mocks.geminiGenerate).not.toHaveBeenCalled()
    expect(mocks.groqCreate).not.toHaveBeenCalled()
  })

  it('2. succeeds with Gemini as primary', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key'
    process.env.GROQ_API_KEY = 'groq-key'
    mocks.geminiGenerate.mockResolvedValue(geminiReply(VALID_BUILDER))

    const result = await generateWithFallback(PARAMS, BUILDER_SCHEMA)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.provider).toBe('gemini')
    expect(mocks.groqCreate).not.toHaveBeenCalled()
  })

  it('2b. sends a structured request to Gemini (JSON schema, bounded tokens)', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key'
    mocks.geminiGenerate.mockResolvedValue(geminiReply(VALID_BUILDER))
    await generateWithFallback(PARAMS, BUILDER_SCHEMA)
    const call = mocks.geminiGenerate.mock.calls[0][0]
    expect(call.config.responseMimeType).toBe('application/json')
    expect(call.config.responseSchema.type).toBe('OBJECT')
    expect(call.config.maxOutputTokens).toBeGreaterThan(256)
    expect(mocks.geminiGenerate.mock.calls[0][0].contents[0].parts[0].text).toContain('fragrance')
  })

  it('3. succeeds with Groq when Gemini is not configured', async () => {
    process.env.GROQ_API_KEY = 'groq-key'
    mocks.groqCreate.mockResolvedValue(groqReply(VALID_BUILDER))

    const result = await generateWithFallback(PARAMS, BUILDER_SCHEMA)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.provider).toBe('groq')
    expect(mocks.geminiGenerate).not.toHaveBeenCalled()
    // Structured output demand present in the Groq call.
    expect(mocks.groqCreate.mock.calls[0][0].response_format).toEqual({ type: 'json_object' })
  })

  it('4. falls back to Groq exactly once on a transient Gemini failure', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key'
    process.env.GROQ_API_KEY = 'groq-key'
    mocks.geminiGenerate.mockRejectedValue(new Error('503 service unavailable'))
    mocks.groqCreate.mockResolvedValue(groqReply(VALID_BUILDER))

    const result = await generateWithFallback(PARAMS, BUILDER_SCHEMA)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.provider).toBe('groq')
    expect(mocks.geminiGenerate).toHaveBeenCalledTimes(1)
    expect(mocks.groqCreate).toHaveBeenCalledTimes(1)
  })

  it('4b. times out are treated as transient', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key'
    process.env.GROQ_API_KEY = 'groq-key'
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    mocks.geminiGenerate.mockRejectedValue(abort)
    mocks.groqCreate.mockResolvedValue(groqReply(VALID_BUILDER))

    const result = await generateWithFallback(PARAMS, BUILDER_SCHEMA)
    expect(result.ok).toBe(true)
  })

  it('5. does NOT fail over on permanent configuration errors', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key'
    process.env.GROQ_API_KEY = 'groq-key'
    mocks.geminiGenerate.mockRejectedValue(new Error('401 API key not authorized'))
    mocks.groqCreate.mockResolvedValue(groqReply(VALID_BUILDER))

    const result = await generateWithFallback(PARAMS, BUILDER_SCHEMA)
    expect(result.ok).toBe(false)
    expect(mocks.geminiGenerate).toHaveBeenCalledTimes(1)
    expect(mocks.groqCreate).not.toHaveBeenCalled()
  })

  it('5b. retired-model errors are permanent, not retried', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key'
    process.env.GROQ_API_KEY = 'groq-key'
    mocks.geminiGenerate.mockRejectedValue(
      new Error('404 model gemini-2.5-flash is no longer available to new users'),
    )
    mocks.groqCreate.mockResolvedValue(groqReply(VALID_BUILDER))

    const result = await generateWithFallback(PARAMS, BUILDER_SCHEMA)
    expect(result.ok).toBe(false)
    expect(mocks.groqCreate).not.toHaveBeenCalled()
  })

  it('6. malformed JSON fails validation and triggers the fallback', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key'
    process.env.GROQ_API_KEY = 'groq-key'
    mocks.geminiGenerate.mockResolvedValue(geminiReply('not json at all'))
    mocks.groqCreate.mockResolvedValue(groqReply(VALID_BUILDER))

    const result = await generateWithFallback(PARAMS, BUILDER_SCHEMA)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.provider).toBe('groq')
  })

  it('6b. schema-invalid output is rejected', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key'
    process.env.GROQ_API_KEY = 'groq-key'
    mocks.geminiGenerate.mockResolvedValue(geminiReply({ wrongShape: true }))
    mocks.groqCreate.mockRejectedValue(new Error('503 overloaded'))

    const result = await generateWithFallback(PARAMS, BUILDER_SCHEMA)
    expect(result.ok).toBe(false)
  })
})
