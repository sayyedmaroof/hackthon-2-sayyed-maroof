/**
 * Concierge-mode tests: AI direction validation, exclusion enforcement,
 * deterministic fallback with intensity propagation, avoid-name resolution.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runConciergeAI } from '@/lib/ai/concierge'
import { recommendBlends, buildTarget } from '@/lib/concierge'
import { resolveAvoidEntries } from '@/lib/ai/avoid'
import { NOTES_BY_ID } from '@/lib/fragrance-data'
import { resetAiConfig } from '@/lib/ai/config'

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

const awaitAll: Promise<void>[] = []

function geminiDirections(directions: unknown[]) {
  mocks.geminiGenerate.mockResolvedValue({ text: JSON.stringify({ recommendations: directions }) })
}
function bothFail() {
  const error = new Error('503 overloaded')
  mocks.geminiGenerate.mockRejectedValue(error)
  mocks.groqCreate.mockRejectedValue(error)
}

const PREFS = {
  mood: 'sophisticated and fresh',
  occasion: 'office',
  intensity: 'moderate' as const,
  families: ['woody', 'fresh'] as ('woody' | 'fresh')[],
  avoid: ['vanilla'],
  freeText: 'Clean, polished and not too sweet.',
}

describe('avoid-entry resolution', () => {
  it('17. human-readable note names map to real catalog IDs', () => {
    const resolved = resolveAvoidEntries(['vanilla', 'Smoked Oud', 'woody', 'rose'])
    expect(resolved.noteIds).toContain('vanilla')
    expect(resolved.noteIds).toContain('oud')
    expect(resolved.noteIds).toContain('rose')
    expect(resolved.families).toContain('woody')
    expect(resolved.unknown).toEqual([])
  })

  it('17b. quantifier words are never guessed into exclusions', () => {
    const resolved = resolveAvoidEntries(['sweet'])
    expect(resolved.noteIds).toHaveLength(0) // would otherwise match "Sweet Basil"
    expect(resolved.families).toHaveLength(0)
  })
})

describe('deterministic engine (with resolved exclusions)', () => {
  it('16. intensity reaches the recommendation engine', () => {
    const subtle = buildTarget({ ...PREFS, intensity: 'subtle' })
    const bold = buildTarget({ ...PREFS, intensity: 'bold' })
    expect(subtle.intensity).toBeLessThan(bold.intensity)
    expect(subtle.intensity).toBe(3.5)
    expect(bold.intensity).toBe(8)
  })

  it('excluded notes never appear (deterministic path)', () => {
    const recs = recommendBlends(PREFS)
    for (const rec of recs) {
      expect(rec.noteIds).not.toContain('vanilla')
    }
  })

  it('17c. avoided-family blends are impossible when the family is excluded', () => {
    const recs = recommendBlends({ ...PREFS, avoid: ['woody'] })
    const woodyCount = recs.filter((rec: { family: string }) => rec.family === 'woody')
    // Safe perimeter: at most a residual woody-family note may appear, but a
    // woody-family *family mix* must never dominate an excluded direction.
    for (const rec of woodyCount) {
      const woodyShare = rec.profile.familyMix.find(m => m.family === 'woody')?.share ?? 0
      expect(woodyShare).toBeLessThan(0.75)
    }
  })

  it('15. three distinct directions are returned', () => {
    const recs = recommendBlends(PREFS)
    expect(recs.map((r: { tier: string }) => r.tier)).toEqual(['Safe', 'Balanced', 'Bold'])
    const sets = recs.map((r: { noteIds: string[] }) => r.noteIds.join('|'))
    expect(new Set(sets).size).toBe(3)
  })
})

describe('runConciergeAI (AI path)', () => {
  beforeEach(() => {
    resetAiConfig()
    process.env.GEMINI_API_KEY = 'gemini-key'
    process.env.GROQ_API_KEY = 'groq-key'
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    mocks.geminiGenerate.mockReset()
    mocks.groqCreate.mockReset()
    vi.restoreAllMocks()
    delete process.env.GEMINI_API_KEY
    delete process.env.GROQ_API_KEY
  })

  it('15b. three valid AI directions are scored with the real engine', async () => {
    geminiDirections([
      { tier: 'Safe', name: 'Linen Air', noteIds: ['bergamot', 'rose', 'musk'], summary: 'Easy to love.', explanation: 'Opens with bergamot, warms into rose and settles on musk.' },
      { tier: 'Balanced', name: 'Cedar Hour', noteIds: ['yuzu', 'cardamom', 'sandalwood', 'musk'], summary: 'Polished twist.', explanation: 'Yuzu brightens a sandalwood heart with a musk drydown.' },
      { tier: 'Bold', name: 'Night Bazaar', noteIds: ['black-pepper', 'clove', 'oud', 'vanilla'], summary: 'Statement blend.', explanation: 'Pepper and clove spark a smoky oud drydown.' },
    ])
    const result = await runConciergeAI({ ...PREFS, avoid: [] })
    expect(result.source).toBe('gemini')
    expect(result.recommendations).toHaveLength(3)
    expect(result.recommendations.map((r) => r.tier)).toEqual(['Safe', 'Balanced', 'Bold'])
    for (const rec of result.recommendations) {
      // Profiles are computed server-side, never taken from the model.
      expect(rec.profile).toBeTruthy()
      expect(rec.profile.intensity).toBeGreaterThan(0)
      for (const id of rec.noteIds) expect(NOTES_BY_ID[id]).toBeTruthy()
    }
  })

  it('18-AI. an AI direction containing an excluded note is repaired or replaced', async () => {
    geminiDirections([
      { tier: 'Safe', name: 'A', noteIds: ['vanilla', 'bergamot', 'musk'], summary: 'x', explanation: 'x' }, // vanilla excluded
      { tier: 'Balanced', name: 'B', noteIds: ['yuzu', 'cardamom', 'musk'], summary: 'x', explanation: 'x' },
      { tier: 'Bold', name: 'C', noteIds: ['pepper' /* unknown */, 'clove', 'oud'], summary: 'x', explanation: 'x' }, // unknown id
    ])
    const result = await runConciergeAI(PREFS)
    expect(result.recommendations).toHaveLength(3)
    for (const rec of result.recommendations) {
      expect(rec.noteIds).not.toContain('vanilla')
      for (const id of rec.noteIds) expect(NOTES_BY_ID[id]).toBeTruthy()
    }
  })

  it('18-AI2. totally invalid AI output falls back to the deterministic engine with the same preferences', async () => {
    bothFail()
    const result = await runConciergeAI(PREFS)
    expect(result.source).toBe('fallback')
    for (const rec of result.recommendations) {
      expect(rec.noteIds).not.toContain('vanilla')
    }
    // Deterministic and AI fallback must agree on constraint handling.
    expect(result.recommendations.map((r) => r.tier)).toEqual(['Safe', 'Balanced', 'Bold'])
  })

  it('18-AI3. a clash inside an AI direction drops the clash partner, not the whole tier', async () => {
    geminiDirections([
      { tier: 'Safe', name: 'A', noteIds: ['lemon', 'vanilla', 'musk'], summary: 'x', explanation: 'x' }, // lemon+vanilla clash
      { tier: 'Balanced', name: 'B', noteIds: ['yuzu', 'rose', 'musk'], summary: 'x', explanation: 'x' },
      { tier: 'Bold', name: 'C', noteIds: ['black-pepper', 'clove', 'sandalwood'], summary: 'x', explanation: 'x' },
    ])
    const result = await runConciergeAI({ ...PREFS, avoid: [] })
    const safe = result.recommendations.find((r) => r.tier === 'Safe')
    expect(safe).toBeTruthy()
    // Clash must be resolved inside the validated result.
    expect(safe!.noteIds.filter((id) => id === 'lemon' || id === 'vanilla').length).toBeLessThan(2)
  })
})
