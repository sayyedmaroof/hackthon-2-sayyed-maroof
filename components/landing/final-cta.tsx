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
      className="relative overflow-hidden bg-gradient-to-br from-[#D9E9FA] via-[#EFF6FD] to-[#C4DCF4] text-[#0E1B33]"
    >
      {/* Top border shimmer */}
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

      {/* Background atmosphere */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/50 to-transparent" />
        <div className="absolute right-0 top-0 h-[500px] w-[400px] rounded-full bg-[#57B8F2]/20 blur-[100px]" />
        <div className="absolute -left-20 bottom-0 h-[400px] w-[500px] rounded-full bg-[#1E63C8]/12 blur-[80px]" />
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
              className="pointer-events-none absolute inset-0 translate-y-8 scale-75 rounded-full bg-[#57B8F2]/30 blur-[60px]"
            />
            <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] shadow-[0_32px_70px_rgba(16,55,120,0.25)]">
              <Image
                src="/images/studio-lab.jpg"
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 80vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#051334]/35 via-transparent to-[#57B8F2]/10"
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
            className="text-xs font-medium uppercase tracking-[0.35em] text-[#1E63C8]"
          >
            Your signature awaits
          </motion.p>

          <motion.h2
            id="cta-heading"
            variants={fadeUp}
            className="mt-5 font-serif text-5xl font-medium leading-[1.06] text-[#0A1A52] sm:text-6xl"
          >
            Don't just wear a fragrance.
            <br />
            <em className="bg-gradient-to-r from-[#1E63C8] to-[#57B8F2] bg-clip-text text-transparent">
              Create your signature.
            </em>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-lg leading-relaxed text-[#0E1B33]/65"
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
                className="btn-shine inline-flex items-center justify-center gap-2.5 rounded-full bg-[#1E63C8] px-8 py-3.5 font-medium text-[#F5F9FD] shadow-[0_10px_30px_rgba(30,99,200,0.3)] transition-colors hover:bg-[#154FB8]"
              >
                Open the builder
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/explore"
                className="inline-flex items-center justify-center rounded-full border border-[#0E1B33]/12 bg-white/50 px-8 py-3.5 font-medium text-[#0A1A52]/85 backdrop-blur-sm transition-colors hover:border-[#1E63C8]/40 hover:text-[#1E63C8]"
              >
                Browse presets
              </Link>
            </motion.div>
          </motion.div>

          {/* Divider & stats */}
          <motion.dl
            variants={fadeUp}
            className="mt-12 grid max-w-xs grid-cols-3 gap-6 border-t border-[#0E1B33]/10 pt-6"
          >
            {[
              { dt: 'Notes', dd: '21' },
              { dt: 'Presets', dd: '6' },
              { dt: 'From', dd: '$43' },
            ].map(({ dt, dd }) => (
              <div key={dt}>
                <dt className="text-[0.65rem] uppercase tracking-[0.25em] text-[#8FA3BC]">{dt}</dt>
                <dd className="mt-1.5 font-serif text-3xl text-[#1E63C8]">{dd}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </div>
    </section>
  )
}
