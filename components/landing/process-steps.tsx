'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { fadeIn, fadeUp, staggerContainer } from '@/lib/motion'

const STEPS = [
  {
    n: '01',
    title: 'Choose your notes',
    body: 'Browse 21 notes across citrus, floral, woody, amber, spicy, fresh and gourmand families. Each note has a personality.',
    accent: '#B88A3B',
  },
  {
    n: '02',
    title: 'Build your layers',
    body: 'Place each note in its natural layer — a bright opening, an expressive heart, a lasting base. Watch the blend take shape.',
    accent: '#D4B16A',
  },
  {
    n: '03',
    title: 'Personalize the bottle',
    body: 'Pick size, concentration, bottle type, atomizer and label. The liquid colour shifts in real time as your blend evolves.',
    accent: '#B88A3B',
  },
  {
    n: '04',
    title: 'Order your fragrance',
    body: 'Every blend is validated for compatibility, priced transparently, and saved to your account to revisit any time.',
    accent: '#D4B16A',
  },
]

export function ProcessSteps() {
  return (
    <section
      aria-labelledby="process-heading"
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
          <motion.p variants={fadeUp} className="text-xs font-medium uppercase tracking-[0.35em] text-[#B88A3B]">
            How it works
          </motion.p>
          <motion.h2
            id="process-heading"
            variants={fadeUp}
            className="mt-4 font-serif text-4xl font-medium leading-tight sm:text-5xl text-[#30241F]"
          >
            From a single note to your{' '}
            <em className="text-[#B88A3B]">signature scent.</em>
          </motion.h2>
        </motion.div>

        {/* Steps grid */}
        <motion.ol
          className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[#E5D8C4] bg-[#E5D8C4] sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer(0.08, 0.1)}
        >
          {STEPS.map((step) => (
            <motion.li
              key={step.n}
              variants={fadeUp}
              className="group flex flex-col bg-[#FFFEFC] p-7 transition-colors duration-300 hover:bg-[#FAF7F0]"
            >
              <span
                className="font-serif text-5xl leading-none"
                style={{ color: step.accent, opacity: 0.6 }}
              >
                {step.n}
              </span>
              <h3 className="mt-6 font-serif text-2xl text-[#30241F]">{step.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#8B7B72]">{step.body}</p>
            </motion.li>
          ))}
        </motion.ol>

        {/* CTA link */}
        <motion.div
          className="mt-10 flex justify-end"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeIn}
          transition={{ delay: 0.3 }}
        >
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#B88A3B] transition-colors hover:text-[#30241F]"
          >
            Start building <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
