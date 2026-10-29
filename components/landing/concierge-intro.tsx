'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { fadeIn, fadeUp, slideLeft, slideRight, staggerContainer } from '@/lib/motion'

const MOODS = [
  { label: 'Fresh',       value: 'fresh' },
  { label: 'Mysterious',  value: 'mysterious' },
  { label: 'Romantic',    value: 'romantic' },
  { label: 'Warm',        value: 'warm' },
  { label: 'Sophisticated', value: 'sophisticated' },
  { label: 'Energetic',   value: 'energetic' },
]

const MOOD_COPY: Record<string, string> = {
  fresh:         'A clean, luminous scent — like morning air and sea glass.',
  mysterious:    'Smoky depths, warm resins, the scent of an intriguing presence.',
  romantic:      'Velvety florals and warm skin. Made for close encounters.',
  warm:          'Amber, vanilla, sandalwood. Comforting and deeply personal.',
  sophisticated: 'Dry woods, iris, a whisper of spice. Refined and timeless.',
  energetic:     'Sparkling citrus, bright herbs, a burst of clean vitality.',
}

export function ConciergeIntro() {
  const [activeMood, setActiveMood] = useState<string | null>(null)

  return (
    <section
      aria-labelledby="concierge-heading"
      className="bg-gradient-to-b from-[#F1F7FD] via-[#E4EEF8] to-[#F5F9FD] text-[#0E1B33]"
    >
      {/* Top border shimmer */}
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-[#57B8F2]/40 to-transparent" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28 lg:px-8">

        {/* Left — image */}
        <motion.div
          className="relative"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={slideLeft}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-[0_24px_60px_rgba(16,55,120,0.18)]">
            <Image
              src="/images/concierge.png"
              alt="A perfumer's workbench with glass vials, scent blotters and jasmine flowers in candlelight"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
            {/* Azure overlay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#051334]/35 via-transparent to-[#57B8F2]/15"
            />
          </div>

          {/* Floating Sparkles badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
            className="absolute -right-4 -top-4 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-xl backdrop-blur-sm md:right-4 md:top-4"
          >
            <Sparkles className="size-5 text-[#1E63C8]" aria-hidden="true" />
          </motion.div>
        </motion.div>

        {/* Right — copy + mood selector */}
        <motion.div
          className="max-w-lg"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer(0.1, 0.15)}
        >
          <motion.p
            variants={fadeUp}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.35em] text-[#1E63C8]"
          >
            <span className="inline-block h-px w-6 bg-[#1E63C8]/50" aria-hidden="true" />
            Scent concierge
          </motion.p>

          <motion.h2
            id="concierge-heading"
            variants={fadeUp}
            className="mt-4 font-serif text-4xl font-medium leading-tight text-[#0A1A52] sm:text-5xl"
          >
            Not sure where to begin?{' '}
            <em className="text-[#1E63C8]">Describe a feeling.</em>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-5 leading-relaxed text-[#5C728F]"
          >
            Tell our concierge about your mood, occasion and the families you love. You'll receive three compatible blends — safe, balanced and bold — ready to load into the builder.
          </motion.p>

          {/* Mood chips */}
          <motion.div variants={fadeUp} className="mt-8">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#8FA3BC]">
              How are you feeling today?
            </p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((mood) => (
                <motion.button
                  key={mood.value}
                  type="button"
                  onClick={() => setActiveMood(activeMood === mood.value ? null : mood.value)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  aria-pressed={activeMood === mood.value}
                  className="rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200"
                  style={
                    activeMood === mood.value
                      ? {
                          borderColor: '#1E63C8',
                          backgroundColor: 'rgba(30,99,200,0.08)',
                          color: '#1253B8',
                        }
                      : {
                          borderColor: '#CCDFF0',
                          backgroundColor: '#FFFFFF',
                          color: '#5C728F',
                        }
                  }
                >
                  {mood.label}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Mood description */}
          <AnimatePresence mode="wait">
            {activeMood && (
              <motion.p
                key={activeMood}
                initial={{ opacity: 0, height: 0, y: 6 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 overflow-hidden border-l-2 border-[#57B8F2]/60 pl-4 font-serif text-lg italic text-[#0A1A52]/80"
              >
                {MOOD_COPY[activeMood]}
              </motion.p>
            )}
          </AnimatePresence>

          {/* CTA */}
          <motion.div variants={fadeUp} className="mt-9">
            <Link
              href={activeMood ? `/concierge?mood=${activeMood}` : '/concierge'}
              className="btn-shine inline-flex items-center gap-2 rounded-full bg-[#1E63C8] px-7 py-3.5 font-medium text-[#F5F9FD] shadow-[0_10px_30px_rgba(30,99,200,0.25)] transition-colors hover:bg-[#154FB8]"
            >
              Find my scent <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
