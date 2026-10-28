'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { fadeUp, staggerContainer } from '@/lib/motion'

export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="relative overflow-hidden bg-[#24101F] text-[#FAF7F0]"
    >
      {/* Top border shimmer */}
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-[#B88A3B]/30 to-transparent" />

      {/* Background atmosphere */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#351329]/40 to-transparent" />
        <div className="absolute right-0 top-0 h-[500px] w-[400px] rounded-full bg-[#B88A3B]/8 blur-[100px]" />
        <div className="absolute -left-20 bottom-0 h-[400px] w-[500px] rounded-full bg-[#351329]/50 blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28 lg:px-8">

        {/* Left — bottle image */}
        <motion.div
          className="order-2 md:order-1"
          initial={{ opacity: 0, x: -28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative mx-auto max-w-sm md:max-w-none">
            {/* Glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 translate-y-8 scale-75 rounded-full bg-[#B88A3B]/20 blur-[60px]"
            />
            <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
              <Image
                src="/images/hero-bottle.png"
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 80vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#24101F]/60 via-transparent to-[#B88A3B]/8"
              />
            </div>
          </div>
        </motion.div>

        {/* Right — copy and CTAs */}
        <motion.div
          className="order-1 md:order-2 max-w-lg"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer(0.12, 0)}
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-medium uppercase tracking-[0.35em] text-[#D4B16A]"
          >
            Your signature awaits
          </motion.p>

          <motion.h2
            id="cta-heading"
            variants={fadeUp}
            className="mt-5 font-serif text-5xl font-medium leading-[1.06] sm:text-6xl"
          >
            Don't just wear a fragrance.
            <br />
            <em className="text-[#D4B16A]">Create your signature.</em>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-lg leading-relaxed text-[#FAF7F0]/65"
          >
            21 notes. Infinite combinations. One blend that is unmistakably, irrevocably yours.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/builder"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#B88A3B] px-8 py-3.5 font-medium text-[#FAF7F0] transition-colors hover:bg-[#D4B16A]"
              >
                Open the builder
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/explore"
                className="inline-flex items-center justify-center rounded-full border border-[#FAF7F0]/20 px-8 py-3.5 font-medium text-[#FAF7F0]/80 transition-colors hover:border-[#B88A3B]/50 hover:bg-[#B88A3B]/10"
              >
                Browse presets
              </Link>
            </motion.div>
          </motion.div>

          {/* Divider & stats */}
          <motion.dl
            variants={fadeUp}
            className="mt-12 grid max-w-xs grid-cols-3 gap-6 border-t border-[#FAF7F0]/10 pt-6"
          >
            {[
              { dt: 'Notes', dd: '21' },
              { dt: 'Presets', dd: '6' },
              { dt: 'From', dd: '$43' },
            ].map(({ dt, dd }) => (
              <div key={dt}>
                <dt className="text-[0.65rem] uppercase tracking-[0.25em] text-[#FAF7F0]/40">{dt}</dt>
                <dd className="mt-1.5 font-serif text-3xl text-[#D4B16A]">{dd}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </div>
    </section>
  )
}
