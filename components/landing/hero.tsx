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
  heroBottle,
  heroContainer,
} from '@/lib/motion'

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
      className="relative overflow-hidden bg-[#24101F] text-[#FAF7F0]"
      style={{ minHeight: 'min(100svh, 840px)' }}
    >
      {/* ── Atmospheric background layers ─────────────────────────────── */}
      <motion.div
        aria-hidden="true"
        style={{ y: bgY }}
        className="pointer-events-none absolute inset-0 z-0"
      >
        {/* Radial warm glow — right */}
        <div className="absolute right-0 top-0 h-[680px] w-[580px] rounded-full bg-[#B88A3B]/10 blur-[120px]" />
        {/* Deep plum vignette — left */}
        <div className="absolute -left-32 bottom-0 h-[480px] w-[520px] rounded-full bg-[#351329]/60 blur-[100px]" />
        {/* Top edge shimmer */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#B88A3B]/40 to-transparent" />
      </motion.div>

      {/* ── Decorative gold particles ──────────────────────────────────── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        initial="hidden"
        animate="show"
        variants={fadeIn}
        transition={{ delay: 1.2, duration: 1.2 }}
      >
        {[
          { top: '18%', left: '8%',  w: 3,  h: 3 },
          { top: '62%', left: '4%',  w: 2,  h: 2 },
          { top: '32%', left: '14%', w: 1.5,h: 1.5 },
          { top: '75%', left: '22%', w: 2.5,h: 2.5 },
        ].map((dot, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-[#D4B16A]"
            style={{ top: dot.top, left: dot.left, width: dot.w, height: dot.h, opacity: 0.5 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 3 + i * 0.8, ease: 'easeInOut' }}
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
          {/* Eyebrow */}
          <motion.p
            variants={fadeUp}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.35em] text-[#D4B16A]"
          >
            <span className="inline-block h-px w-8 bg-[#D4B16A]/60" aria-hidden="true" />
            Custom fragrance atelier
          </motion.p>

          {/* Headline */}
          <motion.h1
            variants={fadeUpLarge}
            className="mt-6 font-serif text-5xl font-medium leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.5rem]"
          >
            Your scent.
            <br />
            <em className="text-[#D4B16A]">Your signature.</em>
          </motion.h1>

          {/* Body */}
          <motion.p
            variants={fadeUp}
            className="mt-7 max-w-md text-lg leading-relaxed text-[#FAF7F0]/70"
          >
            Go beyond choosing a fragrance. Compose one that feels&nbsp;
            <span className="text-[#FAF7F0]/90">unmistakably yours.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                href="/builder"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#B88A3B] px-7 py-3.5 font-medium text-[#FAF7F0] transition-colors hover:bg-[#D4B16A]"
              >
                Create Your Signature Scent
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                href="/explore"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#FAF7F0]/20 px-7 py-3.5 font-medium text-[#FAF7F0]/90 transition-colors hover:border-[#B88A3B]/50 hover:bg-[#B88A3B]/10 hover:text-[#D4B16A]"
              >
                <Sparkles className="size-4 text-[#D4B16A]" aria-hidden="true" />
                Explore Fragrances
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats strip */}
          <motion.dl
            variants={fadeIn}
            className="mt-14 grid max-w-sm grid-cols-3 gap-6 border-t border-[#FAF7F0]/10 pt-6"
          >
            {[
              { dt: 'Notes', dd: '21' },
              { dt: 'Layers', dd: '3' },
              { dt: 'From', dd: '$43' },
            ].map(({ dt, dd }) => (
              <div key={dt}>
                <dt className="text-[0.65rem] uppercase tracking-[0.25em] text-[#FAF7F0]/50">{dt}</dt>
                <dd className="mt-1.5 font-serif text-3xl text-[#D4B16A]">{dd}</dd>
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
              className="pointer-events-none absolute inset-0 z-0 translate-y-8 scale-75 rounded-full bg-[#B88A3B]/20 blur-[60px]"
            />

            {/* Bottle image */}
            <motion.div
              className="relative aspect-[3/4] overflow-hidden rounded-[2rem] shadow-[0_32px_80px_rgba(0,0,0,0.55)]"
              variants={floatY}
              animate="animate"
            >
              <Image
                src="/images/hero-bottle.png"
                alt="An amber glass perfume bottle with a copper cap, surrounded by rose petals and warm spices"
                fill
                priority
                sizes="(min-width: 768px) 50vw, 90vw"
                className="object-cover"
              />
              {/* Subtle sheen overlay */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#B88A3B]/12 via-transparent to-[#24101F]/40"
              />
            </motion.div>

            {/* Floating info card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-4 bottom-4 overflow-hidden rounded-2xl border border-[#FAF7F0]/10 bg-[#24101F]/75 p-4 backdrop-blur-md"
            >
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[#D4B16A]">Now composing</p>
              <p className="mt-1.5 font-serif text-xl leading-tight">Afterglow No. 01</p>
              <p className="mt-1 text-xs text-[#FAF7F0]/60">Bergamot · Jasmine · Rose · Oud · Vanilla</p>
            </motion.div>

            {/* Corner accent */}
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.8 }}
              className="absolute -right-3 -top-3 h-16 w-16 rounded-full border border-[#B88A3B]/30"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom edge separator */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FAF7F0]/8 to-transparent"
      />
    </section>
  )
}
