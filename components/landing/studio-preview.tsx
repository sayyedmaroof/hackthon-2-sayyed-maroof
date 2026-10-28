'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { GlassBottle } from '@/components/glass-bottle'
import { DEFAULT_BOTTLE, NOTES } from '@/lib/fragrance-data'
import { computeProfile } from '@/lib/scoring'
import { fadeIn, fadeUp, staggerContainer } from '@/lib/motion'

// A curated subset of notes for the landing preview demo
const DEMO_NOTE_IDS = [
  'bergamot',      // top — citrus
  'pink-pepper',   // top — spicy
  'rose',          // middle — floral
  'jasmine',       // middle — floral
  'sandalwood',    // base — woody
  'amber',         // base — amber
  'vanilla',       // base — gourmand
  'oud',           // base — woody
]

const DEMO_NOTES = NOTES.filter((n) => DEMO_NOTE_IDS.includes(n.id))

// Layer display order for the preview
const LAYER_LABELS = { top: 'Top', middle: 'Heart', base: 'Base' }
const LAYER_ACCENT = {
  top:    '#DFC84A',  // citrus golden-yellow
  middle: '#D83060',  // rose deep pink
  base:   '#8A5A3A',  // woody warm brown
}

const CHARACTER_COPY: Record<string, string> = {
  Safe:     'Easy to love, effortless to wear.',
  Balanced: 'Polished and characterful.',
  Bold:     'A statement blend with real presence.',
}

export function StudioPreview() {
  const [selected, setSelected] = useState<string[]>(['bergamot', 'rose', 'sandalwood'])

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id],
    )
  }

  const profile = computeProfile(selected)

  return (
    <section
      aria-labelledby="studio-preview-heading"
      className="bg-[#FAF7F0] py-20 md:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="max-w-2xl"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer(0.1, 0)}
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-medium uppercase tracking-[0.35em] text-[#B88A3B]"
          >
            Interactive preview
          </motion.p>
          <motion.h2
            id="studio-preview-heading"
            variants={fadeUp}
            className="mt-4 font-serif text-4xl font-medium leading-tight sm:text-5xl text-[#30241F]"
          >
            Compose in real time.
            <br />
            <em className="text-[#B88A3B]">See your blend emerge.</em>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-[#8B7B72]">
            Select a few notes below — the bottle colour and character update instantly.
          </motion.p>
        </motion.div>

        {/* Main preview area */}
        <div className="mt-14 grid gap-8 md:grid-cols-[1fr_280px] lg:gap-12 xl:grid-cols-[1fr_320px]">

          {/* Note selector — left */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            variants={staggerContainer(0.05, 0.1)}
          >
            {(['top', 'middle', 'base'] as const).map((layer) => {
              const layerNotes = DEMO_NOTES.filter((n) => n.layer === layer)
              return (
                <motion.div key={layer} variants={fadeUp} className="mb-8">
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="text-[0.6rem] font-medium uppercase tracking-[0.3em]"
                      style={{ color: LAYER_ACCENT[layer] }}
                    >
                      {LAYER_LABELS[layer]}
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ backgroundColor: `${LAYER_ACCENT[layer]}30` }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {layerNotes.map((note) => {
                      const active = selected.includes(note.id)
                      return (
                        <motion.button
                          key={note.id}
                          type="button"
                          onClick={() => toggle(note.id)}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          aria-pressed={active}
                          className="relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200"
                          style={
                            active
                              ? {
                                  borderColor: note.color,
                                  backgroundColor: `${note.color}22`,
                                  color: '#30241F',
                                }
                              : {
                                  borderColor: '#E5D8C4',
                                  backgroundColor: '#FFFEFC',
                                  color: '#8B7B72',
                                }
                          }
                        >
                          {/* Color dot */}
                          <span
                            className="size-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: note.color }}
                            aria-hidden="true"
                          />
                          {note.name}
                          {/* Checkmark */}
                          <AnimatePresence>
                            {active && (
                              <motion.span
                                key="check"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                              >
                                <Check className="size-3.5 text-[#B88A3B]" aria-hidden="true" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}

            {/* Character readout */}
            <AnimatePresence mode="wait">
              {profile ? (
                <motion.div
                  key={profile.character + profile.family}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-4 rounded-2xl border border-[#E5D8C4] bg-[#FFFEFC] p-5"
                >
                  <p className="text-[0.6rem] font-medium uppercase tracking-[0.3em] text-[#B88A3B]">
                    Blend character
                  </p>
                  <p className="mt-2 font-serif text-2xl text-[#30241F] capitalize">
                    {profile.character} — {profile.family}
                  </p>
                  <p className="mt-1 text-sm text-[#8B7B72]">
                    {CHARACTER_COPY[profile.character]}
                  </p>

                  {/* Attribute bars */}
                  <dl className="mt-4 space-y-2">
                    {(
                      [
                        { key: 'freshness' as const, label: 'Freshness' },
                        { key: 'warmth' as const, label: 'Warmth' },
                        { key: 'intensity' as const, label: 'Intensity' },
                      ] as const
                    ).map(({ key, label }) => (
                      <div key={key} className="grid grid-cols-[5rem_1fr_2rem] items-center gap-3 text-xs">
                        <dt className="text-[#8B7B72]">{label}</dt>
                        <dd className="contents">
                          <span className="h-1.5 overflow-hidden rounded-full bg-[#E5D8C4]">
                            <motion.span
                              className="block h-full rounded-full bg-[#B88A3B]"
                              initial={{ width: 0 }}
                              animate={{ width: `${(profile[key] as number) * 10}%` }}
                              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </span>
                          <span className="text-right tabular-nums text-[#30241F]">
                            {(profile[key] as number).toFixed(1)}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 rounded-2xl border border-dashed border-[#E5D8C4] p-5 text-center text-sm text-[#8B7B72]"
                >
                  Select at least one note to see your blend character.
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA */}
            <motion.div
              className="mt-6"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <Link
                href="/builder"
                className="inline-flex items-center gap-2 rounded-full bg-[#351329] px-6 py-3 text-sm font-medium text-[#FAF7F0] transition-colors hover:bg-[#B88A3B]"
              >
                Open the full builder <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <p className="mt-2 text-xs text-[#8B7B72]">
                This is a simplified preview. Your saved blends are separate.
              </p>
            </motion.div>
          </motion.div>

          {/* Bottle — right */}
          <motion.div
            className="flex flex-col items-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            {/* Ambient glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute h-64 w-64 rounded-full blur-[80px]"
              style={{
                backgroundColor: profile?.color ? `${profile.color}40` : '#B88A3B22',
              }}
            />
            <div className="relative z-10 w-48">
              <GlassBottle
                name={profile ? `${profile.character} Blend` : 'Your Blend'}
                color={profile?.color ?? null}
                bottle={DEFAULT_BOTTLE}
                noteCount={selected.length}
                className="drop-shadow-[0_24px_48px_rgba(0,0,0,0.22)]"
              />
            </div>
            <p className="mt-4 text-center text-xs text-[#8B7B72]">
              {selected.length === 0
                ? 'Select notes to fill the bottle'
                : `${selected.length} note${selected.length > 1 ? 's' : ''} selected`}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
