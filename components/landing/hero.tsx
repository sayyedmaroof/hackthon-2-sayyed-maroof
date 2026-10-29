'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'
import {
  fadeIn,
  fadeUp,
  fadeUpLarge,
  floatY,
  floatYSlow,
  heroBottle,
  heroContainer,
} from '@/lib/motion'

const FLOATING_CHIPS = [
  {
    label: 'Top · Bergamot',
    className: '-left-3 top-16  sm:left-0',
    delay: 1.5,
  },
  {
    label: 'Heart · Jasmine',
    className: '-right-2 top-1/3 sm:-right-6',
    delay: 1.7,
  },
  {
    label: 'Base · Vanilla',
    className: '-left-2 bottom-24 sm:left-2',
    delay: 1.9,
  },
]

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)

  // Subtle parallax on scroll
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const bottleY = useTransform(scrollYProgress, [0, 1], [0, 40])
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 60])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-to-b from-[#E8F1FB] via-[#F5F9FD] to-[#F5F9FD] text-[#0E1B33]"
      style={{ minHeight: 'min(100svh, 840px)' }}
    >
      {/* ── Atmospheric background layers ─────────────────────────────── */}
      <motion.div
        aria-hidden="true"
        style={{ y: bgY }}
        className="pointer-events-none absolute inset-0 z-0"
      >
        {/* Luminous azure glow — right */}
        <div className="absolute right-0 top-0 h-[680px] w-[580px] rounded-full bg-[#57B8F2]/25 blur-[120px]" />
        {/* Soft sapphire wash — left */}
        <div className="absolute -left-32 bottom-0 h-[480px] w-[520px] rounded-full bg-[#1E63C8]/10 blur-[100px]" />
        {/* Airy white breathe — center bottom */}
        <div className="absolute bottom-0 left-1/2 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-white/60 blur-[90px]" />
      </motion.div>

      {/* ── Decorative azure particles ──────────────────────────────────── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        initial="hidden"
        animate="show"
        variants={fadeIn}
        transition={{ delay: 1.2, duration: 1.2 }}
      >
        {[
          { top: '18%', left: '8%', w: 3, h: 3 },
          { top: '62%', left: '4%', w: 2, h: 2 },
          { top: '32%', left: '14%', w: 1.5, h: 1.5 },
          { top: '75%', left: '22%', w: 2.5, h: 2.5 },
        ].map((dot, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-[#57B8F2]"
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.w,
              height: dot.h,
              opacity: 0.45,
            }}
            animate={{ opacity: [0.25, 0.6, 0.25] }}
            transition={{
              repeat: Infinity,
              duration: 3 + i * 0.8,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 pb-20 pt-16 sm:px-6 md:grid-cols-2 md:gap-12 md:pb-28 md:pt-24 lg:px-8">
        {/* Left — editorial copy */}
        <motion.div
          className="max-w-xl"
          initial="hidden"
          animate="show"
          variants={heroContainer}
        >
          {/* Eyebrow — brand statement */}
          <motion.p
            variants={fadeUp}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.35em] text-[#1E63C8]"
          >
            <span
              className="inline-block h-px w-8 bg-[#1E63C8]/50"
              aria-hidden="true"
            />
            ScentBuild Studio · AI-Powered Fragrance Builder
          </motion.p>

          {/* Headline */}
          <motion.h1
            variants={fadeUpLarge}
            className="mt-6 font-serif text-4xl font-medium leading-[1.04] tracking-tight text-[#0A1A52] sm:text-6xl lg:text-[4.5rem]"
          >
            Your scent.
            <br />
            <em className="bg-gradient-to-r from-[#1E63C8] to-[#57B8F2] bg-clip-text text-transparent">
              Your signature.
            </em>
          </motion.h1>

          {/* Body */}
          <motion.p
            variants={fadeUp}
            className="mt-7 max-w-md text-lg leading-relaxed text-[#5C728F]"
          >
            Build your perfect fragrance with{' '}
            <span className="font-semibold text-[#1E63C8]">
              AI-guided recommendations
            </span>
            . Layer notes intelligently, balance compositions expertly, and
            create a scent that feels&nbsp;
            <span className="font-medium text-[#0A1A52]">
              unmistakably yours.
            </span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/builder"
                className="btn-shine inline-flex items-center justify-center gap-2.5 rounded-full bg-[#1E63C8] px-7 py-3.5 font-medium text-[#F5F9FD] shadow-[0_10px_30px_rgba(30,99,200,0.28)] transition-colors hover:bg-[#154FB8]"
              >
                Start Building with AI
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/explore"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0E1B33]/12 bg-white/60 px-7 py-3.5 font-medium text-[#0A1A52]/90 backdrop-blur-sm transition-colors hover:border-[#1E63C8]/40 hover:text-[#1E63C8]"
              >
                <Sparkles
                  className="size-4 text-[#1E63C8]"
                  aria-hidden="true"
                />
                Explore Fragrances
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats strip */}
          <motion.dl
            variants={fadeIn}
            className="mt-14 grid max-w-sm grid-cols-3 gap-6 border-t border-[#0E1B33]/10 pt-6"
          >
            {[
              { dt: 'Notes', dd: '21' },
              { dt: 'Layers', dd: '3' },
              { dt: 'From', dd: '$43' },
            ].map(({ dt, dd }) => (
              <div key={dt}>
                <dt className="text-[0.65rem] uppercase tracking-[0.25em] text-[#8FA3BC]">
                  {dt}
                </dt>
                <dd className="mt-1.5 font-serif text-3xl text-[#1E63C8]">
                  {dd}
                </dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        {/* Right — bottle */}
        <motion.div
          style={{ y: bottleY }}
          className="relative mx-auto w-full max-w-[460px] md:max-w-none"
        >
          <motion.div
            initial="hidden"
            animate="show"
            variants={heroBottle}
            className="relative"
          >
            {/* Ambient glow behind the bottle */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 translate-y-8 scale-75 rounded-full bg-[#57B8F2]/35 blur-[60px]"
            />

            {/* Bottle image */}
            <motion.div
              className="relative aspect-[3/4] overflow-hidden rounded-[2rem] shadow-[0_32px_70px_rgba(16,55,120,0.28)]"
              variants={floatY}
              animate="animate"
            >
              <Image
                src="/images/hero-bottle.jpg"
                alt="ScentBuild crystal perfume flacon with atomizer bulb, white and green botanicals on a sapphire-blue backdrop"
                fill
                priority
                sizes="(min-width: 768px) 50vw, 90vw"
                className="object-cover"
              />
              {/* Subtle sheen overlay */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#57B8F2]/10 via-transparent to-[#051334]/20"
              />
            </motion.div>

            {/* Floating info card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 1.1,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute inset-x-4 bottom-4 overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg backdrop-blur-md"
            >
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[#1E63C8]">
                Now composing
              </p>
              <p className="mt-1.5 font-serif text-xl leading-tight text-[#0A1A52]">
                Afterglow No. 01
              </p>
              <p className="mt-1 text-xs text-[#5C728F]">
                Bergamot · Jasmine · Rose · Oud · Vanilla
              </p>
            </motion.div>

            {/* Corner accent */}
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.8 }}
              className="absolute -right-3 -top-3 h-16 w-16 rounded-full border border-[#57B8F2]/50"
            />

            {/* Floating note chips — hint at the blend narrative */}
            {FLOATING_CHIPS.map(chip => (
              <motion.div
                key={chip.label}
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: chip.delay,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`absolute z-20 ${chip.className}`}
              >
                <motion.div
                  variants={floatYSlow}
                  animate="animate"
                  className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-[#0A1A52] shadow-[0_8px_24px_rgba(16,55,120,0.12)] backdrop-blur-md"
                >
                  <span className="size-1.5 rounded-full bg-[#57B8F2]" />
                  {chip.label}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom edge separator */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#E4EEF8]/60 to-transparent"
      />
    </section>
  )
}
