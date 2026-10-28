'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { FAMILY_LABELS, PRESETS } from '@/lib/fragrance-data'
import { calculatePrice, formatPrice } from '@/lib/pricing'
import { fadeIn, fadeUp, staggerContainer } from '@/lib/motion'
import { cn } from '@/lib/utils'

// Subtle accent tones per preset for the card treatment
const PRESET_ACCENTS: Record<string, { bg: string; border: string; badge: string }> = {
  'royal-ember':  { bg: '#2C1010', border: '#8A3B1A/30', badge: '#C8762E' },
  'azure-wood':   { bg: '#0E1C26', border: '#2A4A5E/40', badge: '#6B9BAF' },
  'velvet-bloom': { bg: '#2A1020', border: '#7A2A4A/30', badge: '#D58A92' },
  'noir-spice':   { bg: '#1A0F0A', border: '#5A3020/30', badge: '#A55A2E' },
}

const DEFAULT_ACCENT = { bg: '#1A120D', border: '#5A3020/30', badge: '#B88A3B' }

export function FeaturedBlends() {
  const featured = PRESETS.filter((p) => p.featured).slice(0, 4)

  return (
    <section
      aria-labelledby="featured-heading"
      className="bg-[#FAF7F0] py-20 md:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="flex flex-col justify-between gap-6 md:flex-row md:items-end"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer(0.1, 0)}
        >
          <div className="max-w-xl">
            <motion.p
              variants={fadeUp}
              className="text-xs font-medium uppercase tracking-[0.35em] text-[#B88A3B]"
            >
              House compositions
            </motion.p>
            <motion.h2
              id="featured-heading"
              variants={fadeUp}
              className="mt-4 font-serif text-4xl font-medium leading-tight sm:text-5xl text-[#30241F]"
            >
              Start from a curated blend.
              <br />
              <em className="text-[#B88A3B]">Make it your own.</em>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-[#8B7B72]">
              Each preset is fully editable. Load one into the builder and transform it.
            </motion.p>
          </div>

          <motion.div variants={fadeIn}>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#B88A3B] transition-colors hover:text-[#30241F]"
            >
              Explore all blends <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Cards */}
        <motion.div
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer(0.09, 0.1)}
        >
          {featured.map((preset) => {
            const price = calculatePrice(preset.noteIds, preset.bottle).unitTotal
            const accent = PRESET_ACCENTS[preset.id] ?? DEFAULT_ACCENT

            return (
              <motion.article
                key={preset.id}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 180, damping: 28 } }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#E5D8C4] bg-[#FFFEFC] shadow-[0_2px_12px_rgba(48,36,31,0.06)] transition-shadow hover:shadow-[0_12px_36px_rgba(48,36,31,0.12)]"
              >
                {/* Image */}
                <Link href={`/blend/${preset.id}`} className="relative block aspect-[4/5] overflow-hidden">
                  <Image
                    src={preset.image}
                    alt={`${preset.name} fragrance styled with its key ingredients`}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Dark overlay at bottom */}
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#24101F]/60 via-transparent to-transparent" />

                  {preset.popular && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#B88A3B]/90 px-2.5 py-1 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-[#FAF7F0]">
                      Popular
                    </span>
                  )}
                </Link>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-2xl leading-tight text-[#30241F]">
                        <Link href={`/blend/${preset.id}`} className="hover:underline underline-offset-2">
                          {preset.name}
                        </Link>
                      </h3>
                      <p className="mt-0.5 text-sm text-[#8B7B72]">{preset.tagline}</p>
                    </div>
                    <p className="shrink-0 font-serif text-lg text-[#B88A3B]">{formatPrice(price)}</p>
                  </div>

                  {/* Family pills */}
                  <ul className="flex flex-wrap gap-1.5" aria-label="Fragrance families">
                    {preset.families.map((family) => (
                      <li
                        key={family}
                        className="rounded-full border border-[#E5D8C4] px-2.5 py-0.5 text-xs text-[#8B7B72]"
                      >
                        {FAMILY_LABELS[family]}
                      </li>
                    ))}
                  </ul>

                  {/* Actions */}
                  <div className="mt-auto flex gap-2 pt-2">
                    <Link
                      href={`/builder?preset=${preset.id}`}
                      className="flex-1 rounded-full bg-[#351329] px-4 py-2.5 text-center text-sm font-medium text-[#FAF7F0] transition-colors hover:bg-[#B88A3B]"
                    >
                      Customize
                    </Link>
                    <Link
                      href={`/blend/${preset.id}`}
                      className="rounded-full border border-[#E5D8C4] px-4 py-2.5 text-sm text-[#30241F] transition-colors hover:border-[#B88A3B]/40 hover:bg-[#FAF7F0]"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
