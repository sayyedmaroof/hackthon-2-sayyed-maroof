'use client'

import { useCallback, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, Compass, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useStudio } from '@/lib/studio-store'
import { recommendBlends } from '@/lib/concierge'
import { calculatePrice, formatPrice } from '@/lib/pricing'
import { FAMILY_LABELS, NOTES_BY_ID } from '@/lib/fragrance-data'
import type { ApiResponse, ConciergeApiResponse } from '@/lib/ai/schemas'
import type { ConciergeRecommendation, Family } from '@/lib/types'
import { Walkthrough, type WalkthroughStep } from '@/components/walkthrough'
import { cn } from '@/lib/utils'

const familyOptions = [
  'woody',
  'floral',
  'citrus',
  'fresh',
  'spicy',
  'amber',
  'gourmand',
] as const
const intensityOptions = ['subtle', 'moderate', 'bold'] as const

// ─── Concierge walkthrough ───────────────────────────────────────────────────

const CONCIERGE_STEPS: WalkthroughStep[] = [
  {
    title: 'Meet your concierge',
    body: 'Not sure where to start? Describe what you are looking for and the concierge tailors three fragrance directions for you.',
  },
  {
    target: 'concierge-form',
    title: 'Tell us what you want',
    body: 'Set the mood, occasion and intensity, then pick the scent families that appeal to you. Everything here helps the recommendation.',
  },
  {
    target: 'concierge-freeform',
    title: 'Say it your way',
    body: 'Avoid notes you dislike, or write a sentence about the feeling you are after — the wording alone can steer the result.',
  },
  {
    target: 'concierge-results',
    title: 'Three tailored directions',
    body: 'Each recommendation is a complete blend with notes and pricing. Generate as many times as you like until one feels right.',
  },
  {
    title: 'Take it to the builder',
    body: 'When a recommendation feels right, use “Load & Edit in Builder” to open it in the studio and fine-tune every layer.',
  },
]

export default function ConciergePage() {
  const router = useRouter()
  const { loadBlend } = useStudio()
  const [mood, setMood] = useState('')
  const [occasion, setOccasion] = useState('evening')
  const [intensity, setIntensity] = useState<'subtle' | 'moderate' | 'bold'>(
    'moderate',
  )
  const [selected, setSelected] = useState<string[]>(['floral', 'woody'])
  const [avoid, setAvoid] = useState('')
  const [freeText, setFreeText] = useState('')
  const [recommendations, setRecommendations] = useState<
    ConciergeRecommendation[]
  >([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sourceNote, setSourceNote] = useState<string | null>(null)
  const [inspiration, setInspiration] = useState<
    ConciergeApiResponse['inspiration']
  >(undefined)
  const [tourReplay, setTourReplay] = useState(0)
  const requestSeq = useRef(0)

  /** Local deterministic composition — also the recovery path when the AI
   *  service is unavailable. Intensity and exclusions apply identically. */
  const runOffline = useCallback(
    (avoidList: string[]) => {
      const next = recommendBlends({
        mood,
        occasion,
        families: selected as Family[],
        intensity,
        freeText,
        avoid: avoidList,
      })
      setRecommendations(next)
      setSourceNote('Composed with the studio’s offline engine — your preferences are unchanged.')
      return next
    },
    [mood, occasion, selected, intensity, freeText],
  )

  const handleSubmit = async () => {
    if (isSubmitting) return
    const avoidList = avoid
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    setIsSubmitting(true)
    setError(null)
    setProgress('Reading your preferences…')
    const requestId = ++requestSeq.current

    // Keep a handle so slow responses can't duplicate.
    const timer = setTimeout(() => setProgress('Composing your recommendations…'), 1600)

    let result: ConciergeApiResponse | null = null
    let errorMessage: string | null = null
    try {
      const res = await fetch('/api/ai/fragrance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'concierge',
          preferences: {
            mood,
            occasion,
            intensity,
            families: selected,
            avoid: avoidList,
            freeText,
          },
        }),
        signal: AbortSignal.timeout(20_000),
      })
      const json = (await res.json().catch(() => null)) as ApiResponse | null
      if (json && json.ok && json.mode === 'concierge') {
        result = json
      } else if (json && !json.ok) {
        errorMessage = json.error.message
      } else {
        errorMessage = 'The concierge could not be reached just now.'
      }
    } catch {
      errorMessage = 'The concierge could not be reached just now.'
    } finally {
      clearTimeout(timer)
    }

    if (requestSeq.current !== requestId) {
      setIsSubmitting(false)
      return
    }

    if (result && result.recommendations.length === 3) {
      setRecommendations(result.recommendations)
      setInspiration(result.inspiration)
      setSourceNote(
        result.degraded
          ? 'Composed with the studio’s offline engine — your preferences are unchanged.'
          : null,
      )
      if (errorMessage) setError(null)
    } else {
      // Full local fallback; the user keeps every form value.
      runOffline(avoidList)
      if (errorMessage) setError(errorMessage)
    }
    setIsSubmitting(false)
    setProgress('')
  }

  const handleLoadAndNavigate = (
    recommendation: ConciergeRecommendation,
  ) => {
    loadBlend({
      name: recommendation.name,
      noteIds: recommendation.noteIds,
      bottle: {
        size: 50,
        concentration: 'edp',
        bottleType: 'classic',
        atomizerMaterial: 'metal',
        atomizerType: 'normal',
        labelStyle: 'ivory',
        base: 'alcohol',
      },
    })
    router.push('/builder')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#1E63C8]">
            Concierge
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-[#0A1A52] sm:text-4xl md:text-5xl md:leading-none">
            Fragrance guidance, tuned to you.
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setTourReplay(key => key + 1)}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[#CCDFF0] bg-[#FDFEFF] px-4 py-2 text-sm font-medium text-[#5C728F] transition-colors hover:border-[#1E63C8]/40 hover:text-[#0E1B33] sm:self-auto"
        >
          <Compass className="size-3.5" aria-hidden="true" /> Tour
        </button>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section
          data-walkthrough="concierge-form"
          className="rounded-[2rem] border border-[#CCDFF0] bg-[#FDFEFF] p-6 shadow-sm"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-[#1E63C8]/10 p-2 text-[#1E63C8]">
              <Sparkles className="size-5" />
            </div>
            <h2 className="font-serif text-3xl text-[#0A1A52]">
              Tell us what you want
            </h2>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#0A1A52]">
                Mood
              </span>
              <input
                value={mood}
                onChange={e => setMood(e.target.value)}
                placeholder="e.g. warm, clean, romantic"
                className="w-full rounded-full border border-[#CCDFF0] bg-white px-4 py-3 text-sm text-[#0E1B33] outline-none transition focus:border-[#1E63C8] focus:ring-2 focus:ring-[#1E63C8]/20"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#0A1A52]">
                Occasion
              </span>
              <select
                value={occasion}
                onChange={e => setOccasion(e.target.value)}
                className="w-full rounded-full border border-[#CCDFF0] bg-white px-4 py-3 text-sm text-[#0E1B33] outline-none transition focus:border-[#1E63C8] focus:ring-2 focus:ring-[#1E63C8]/20"
              >
                <option value="day">Daytime</option>
                <option value="office">Office</option>
                <option value="evening">Evening</option>
                <option value="date">Date night</option>
                <option value="special">Special event</option>
              </select>
            </label>

            <div>
              <p className="mb-2 text-sm font-medium text-[#0A1A52]">
                Intensity
              </p>
              <div className="flex gap-2">
                {intensityOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setIntensity(opt)}
                    className={cn(
                      'flex-1 rounded-full border px-3 py-2 text-sm capitalize transition-colors',
                      intensity === opt
                        ? 'border-[#1E63C8] bg-[#1E63C8] text-[#F5F9FD]'
                        : 'border-[#CCDFF0] bg-white text-[#0E1B33] hover:border-[#1E63C8]/40',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[#0A1A52]">
                Families
              </p>
              <div className="flex flex-wrap gap-2">
                {familyOptions.map(family => (
                  <button
                    key={family}
                    type="button"
                    onClick={() =>
                      setSelected(current =>
                        current.includes(family)
                          ? current.filter(item => item !== family)
                          : [...current, family],
                      )
                    }
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      selected.includes(family)
                        ? 'border-[#1E63C8] bg-[#1E63C8] text-[#F5F9FD]'
                        : 'border-[#CCDFF0] bg-white text-[#0E1B33] hover:border-[#1E63C8]/40',
                    )}
                  >
                    {FAMILY_LABELS[family]}
                  </button>
                ))}
              </div>
            </div>

            <div
              data-walkthrough="concierge-freeform"
              className="space-y-5 border-t border-[#CCDFF0] pt-5"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#0A1A52]">
                  Avoid notes (optional)
                </span>
                <input
                  value={avoid}
                  onChange={e => setAvoid(e.target.value)}
                  placeholder="e.g. oud, vanilla, rose"
                  className="w-full rounded-full border border-[#CCDFF0] bg-white px-4 py-3 text-sm text-[#0E1B33] outline-none transition focus:border-[#1E63C8] focus:ring-2 focus:ring-[#1E63C8]/20"
                />
                <p className="mt-1 text-xs text-[#5C728F]">
                  Comma-separated note names you want to exclude
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#0A1A52]">
                  Additional notes
                </span>
                <textarea
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  rows={5}
                  placeholder="I want something polished, floral and sexy, but not too sweet."
                  className="w-full rounded-[1.5rem] border border-[#CCDFF0] bg-white px-4 py-3 text-sm text-[#0E1B33] outline-none transition focus:border-[#1E63C8] focus:ring-2 focus:ring-[#1E63C8]/20"
                />
              </label>
            </div>

            {error && (
              <div
                className="flex items-start gap-2 rounded-2xl border border-[#E5C4B0] bg-[#FDF3EE] px-4 py-3 text-sm text-[#7A2A10]"
                role="alert"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="mt-1 text-xs font-medium text-[#1E63C8] transition-colors hover:text-[#0A1A52] disabled:opacity-50"
                  >
                    Try again with the offline engine
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1E63C8] px-5 py-3 text-sm font-medium text-[#F5F9FD] transition-colors hover:bg-[#154FB8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {progress || 'Composing your recommendations…'}
                </>
              ) : (
                <>
                  <Wand2 className="size-4" /> Generate recommendations
                </>
              )}
            </button>
          </div>
        </section>

        <section
          data-walkthrough="concierge-results"
          className="space-y-5"
        >
          {recommendations.length === 0 && !isSubmitting ? (
            <div className="rounded-[2rem] border border-dashed border-[#CCDFF0] bg-[#FDFEFF] p-10 text-center text-[#5C728F]">
              Ask the concierge for three fragrance directions tailored to your
              mood and occasion.
            </div>
          ) : isSubmitting && recommendations.length === 0 ? (
            <div className="rounded-[2rem] border border-[#CCDFF0] bg-[#FDFEFF] p-10 text-center">
              <Loader2 className="mx-auto size-6 animate-spin text-[#1E63C8]" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-[#0A1A52]" role="status">
                {progress || 'Composing your recommendations…'}
              </p>
              <p className="mt-1 text-xs text-[#5C728F]">Safe, Balanced and Bold directions take a few seconds.</p>
            </div>
          ) : (
            <>
              {sourceNote && (
                <p className="rounded-full bg-[#E4EEF8] px-4 py-2 text-center text-xs text-[#5C728F]" role="note">
                  {sourceNote}
                </p>
              )}
              {inspiration && inspiration.length > 0 && (
                <p className="text-center text-xs text-[#5C728F]">
                  External inspiration (source: Perfume Picks):{' '}
                  {inspiration.map(ref => `${ref.brand} ${ref.name}`).join(' · ')}
                </p>
              )}
            {recommendations.map(recommendation => {
              const total = calculatePrice(recommendation.noteIds, {
                size: 50,
                concentration: 'edp',
                bottleType: 'classic',
                atomizerMaterial: 'metal',
                atomizerType: 'normal',
                labelStyle: 'ivory',
                base: 'alcohol',
              }).unitTotal
              return (
                <article
                  key={recommendation.tier}
                  className="rounded-[2rem] border border-[#CCDFF0] bg-[#FDFEFF] p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-[#1E63C8]">
                        {recommendation.tier}
                      </p>
                      <h3 className="mt-2 font-serif text-3xl text-[#0A1A52]">
                        {recommendation.name}
                      </h3>
                    </div>
                    <div className="rounded-full border border-[#1E63C8]/30 bg-[#1E63C8]/10 px-3 py-1.5 text-sm font-medium text-[#0A1A52]">
                      {formatPrice(total)}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[#5C728F]">
                    {recommendation.summary}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#0E1B33]">
                    {recommendation.explanation}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {recommendation.noteIds.map(id => {
                      const note = NOTES_BY_ID[id]
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#CCDFF0] bg-white px-2.5 py-1 text-xs text-[#0E1B33]"
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{
                              backgroundColor: note?.color || '#5C728F',
                            }}
                            aria-hidden="true"
                          />
                          {note?.name || id}
                        </span>
                      )
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleLoadAndNavigate(recommendation)}
                      className="inline-flex items-center gap-2 rounded-full bg-[#1E63C8] px-5 py-2.5 text-sm font-medium text-[#F5F9FD] transition-colors hover:bg-[#154FB8]"
                    >
                      Load & Edit in Builder <ArrowRight className="size-4" />
                    </button>
                  </div>
                </article>
              )
            })}
            </>
          )}
        </section>
      </div>

      {/* ── Guided walkthrough ───────────────────────────────────────────── */}
      <Walkthrough
        steps={CONCIERGE_STEPS}
        storageKey="scentbuild:walkthrough:concierge:v1"
        replayKey={tourReplay}
      />
    </div>
  )
}
