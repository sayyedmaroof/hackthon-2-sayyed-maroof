'use client'

import { useState } from 'react'
import { ArrowRight, Sparkles, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { useStudio } from '@/lib/studio-store'
import { recommendBlends } from '@/lib/concierge'
import { calculatePrice, formatPrice } from '@/lib/pricing'
import { cn } from '@/lib/utils'

const familyOptions = ['woody', 'floral', 'citrus', 'fresh', 'spicy', 'amber', 'gourmand'] as const

export default function ConciergePage() {
  const { loadBlend } = useStudio()
  const [mood, setMood] = useState('')
  const [occasion, setOccasion] = useState('evening')
  const [selected, setSelected] = useState<string[]>(['floral', 'woody'])
  const [freeText, setFreeText] = useState('')
  const [recommendations, setRecommendations] = useState<ReturnType<typeof recommendBlends>>([])

  const handleSubmit = () => {
    const next = recommendBlends({
      mood,
      occasion,
      families: selected as any,
      freeText,
      avoid: [],
    })
    setRecommendations(next)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-ember">Concierge</p>
        <h1 className="mt-3 font-serif text-5xl leading-none text-espresso">Fragrance guidance, tuned to you.</h1>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-ember/10 p-2 text-ember"><Sparkles className="size-5" /></div>
            <h2 className="font-serif text-3xl text-espresso">Tell us what you want</h2>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-espresso">Mood</span>
              <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="e.g. warm, clean, romantic" className="w-full rounded-full border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-ember" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-espresso">Occasion</span>
              <select value={occasion} onChange={(e) => setOccasion(e.target.value)} className="w-full rounded-full border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-ember">
                <option value="day">Daytime</option>
                <option value="office">Office</option>
                <option value="evening">Evening</option>
                <option value="date">Date night</option>
                <option value="special">Special event</option>
              </select>
            </label>

            <div>
              <p className="mb-2 text-sm font-medium text-espresso">Families</p>
              <div className="flex flex-wrap gap-2">
                {familyOptions.map((family) => (
                  <button
                    key={family}
                    type="button"
                    onClick={() =>
                      setSelected((current) =>
                        current.includes(family) ? current.filter((item) => item !== family) : [...current, family],
                      )
                    }
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm capitalize transition',
                      selected.includes(family) ? 'border-ember bg-ember text-white' : 'border-border bg-white text-espresso',
                    )}
                  >
                    {family}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-espresso">Free text</span>
              <textarea value={freeText} onChange={(e) => setFreeText(e.target.value)} rows={5} placeholder="I want something polished, floral and sexy, but not too sweet." className="w-full rounded-[1.5rem] border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-ember" />
            </label>

            <button type="button" onClick={handleSubmit} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-espresso px-5 py-3 text-sm font-medium text-ivory transition hover:bg-walnut">
              <Wand2 className="size-4" /> Generate recommendations
            </button>
          </div>
        </section>

        <section className="space-y-5">
          {recommendations.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
              Ask the concierge for three fragrance directions tailored to your mood and occasion.
            </div>
          ) : (
            recommendations.map((recommendation) => {
              const total = calculatePrice(recommendation.noteIds, {
                size: 50,
                concentration: 'edp',
                bottleType: 'classic',
                atomizerMaterial: 'metal',
                atomizerType: 'normal',
                labelStyle: 'ivory',
              }).unitTotal
              return (
                <article key={recommendation.tier} className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-ember">{recommendation.tier}</p>
                      <h3 className="mt-2 font-serif text-3xl text-espresso">{recommendation.name}</h3>
                    </div>
                    <div className="rounded-full border border-ember/30 bg-ember/10 px-3 py-1.5 text-sm font-medium text-espresso">
                      {formatPrice(total)}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{recommendation.summary}</p>
                  <p className="mt-3 text-sm leading-relaxed text-espresso">{recommendation.explanation}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {recommendation.noteIds.map((id) => (
                      <span key={id} className="rounded-full border border-border bg-white px-2.5 py-1 text-xs text-espresso">{id}</span>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
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
                          },
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-espresso px-5 py-2.5 text-sm font-medium text-ivory transition hover:bg-walnut"
                    >
                      Load into builder <ArrowRight className="size-4" />
                    </button>
                    <Link href="/builder" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-espresso transition hover:bg-ivory">
                      Open builder
                    </Link>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </div>
    </div>
  )
}
