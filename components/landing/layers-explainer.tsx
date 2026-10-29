'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { LAYERS, LAYER_INFO, NOTES } from '@/lib/fragrance-data'
import { fadeIn, fadeUp, staggerContainer } from '@/lib/motion'
import { SpotlightCard } from '@/components/ui/spotlight-card'

const LAYER_IMAGE = {
  top:    '/images/notes/citrus.png',
  middle: '/images/notes/rose.png',
  base:   '/images/notes/woods.png',
}

// Distinctive accent colors per layer
const LAYER_ACCENT = {
  top:    { color: '#E8C766', label: 'Opening' },
  middle: { color: '#D58A92', label: 'Character' },
  base:   { color: '#8A5A3A', label: 'Lasting signature' },
}

// Connecting line positions between cards
const CONNECTOR_LABEL = ['→', '→']

export function LayersExplainer() {
  return (
    <section
      aria-labelledby="layers-heading"
      className="bg-gradient-to-b from-[#E4EEF8] via-[#EFF6FD] to-[#F5F9FD] py-20 text-[#0E1B33] md:py-28"
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
            className="text-xs font-medium uppercase tracking-[0.35em] text-[#1E63C8]"
          >
            The fragrance pyramid
          </motion.p>
          <motion.h2
            id="layers-heading"
            variants={fadeUp}
            className="mt-4 font-serif text-4xl font-medium leading-tight text-[#0A1A52] sm:text-5xl"
          >
            Three layers.{' '}
            <em className="text-[#1E63C8]">One story</em> that unfolds on skin.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-5 text-base leading-relaxed text-[#5C728F]"
          >
            Every great fragrance is a composition — a deliberate arc from the first impression to the lasting trail.
          </motion.p>
        </motion.div>

        {/* Three layer cards with connecting indicators */}
        <motion.div
          className="mt-14 grid gap-6 md:grid-cols-3 md:gap-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer(0.12, 0.1)}
        >
          {LAYERS.map((layer, index) => {
            const examples = NOTES.filter((n) => n.layer === layer).slice(0, 4).map((n) => n.name)
            const accent = LAYER_ACCENT[layer]

            return (
              <motion.article
                key={layer}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-2xl border border-[#CCDFF0] bg-white/90 shadow-[0_12px_40px_rgba(16,55,120,0.08)] transition-shadow duration-500 hover:shadow-[0_18px_50px_rgba(16,55,120,0.14)]"
              >
                <SpotlightCard className="relative z-10 rounded-2xl">
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={LAYER_IMAGE[layer]}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Overlay gradient */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#051334]/40 via-transparent to-transparent"
                  />
                  {/* Layer number badge */}
                  <div className="absolute right-4 top-4">
                    <span
                      className="inline-block rounded-full bg-white/85 px-3 py-1 text-[0.6rem] font-medium uppercase tracking-[0.25em] backdrop-blur-sm"
                      style={{ color: accent.color, border: `1px solid ${accent.color}44` }}
                    >
                      {`0${index + 1}`}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Layer role label */}
                  <p
                    className="text-[0.6rem] font-medium uppercase tracking-[0.3em]"
                    style={{ color: accent.color }}
                  >
                    {accent.label}
                  </p>

                  <h3 className="mt-2 font-serif text-3xl leading-tight text-[#0A1A52]">
                    {LAYER_INFO[layer].label}
                  </h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8FA3BC]">
                    {LAYER_INFO[layer].duration}
                  </p>

                  <p className="mt-4 text-sm leading-relaxed text-[#5C728F]">
                    {LAYER_INFO[layer].description}
                  </p>

                  {/* Example notes */}
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="Example notes">
                    {examples.map((name) => (
                      <li
                        key={name}
                        className="rounded-full border border-[#CCDFF0] bg-[#F5F9FD] px-2.5 py-0.5 text-xs text-[#5C728F]"
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
                </SpotlightCard>
              </motion.article>
            )
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-12 text-center"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeIn}
          transition={{ delay: 0.4 }}
        >
          <Link
            href="/builder"
            className="btn-shine inline-flex items-center gap-2 rounded-full bg-[#1E63C8] px-7 py-3 text-sm font-medium text-[#F5F9FD] shadow-[0_10px_30px_rgba(30,99,200,0.25)] transition-colors hover:bg-[#154FB8]"
          >
            Start layering your blend
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
