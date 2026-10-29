'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { fadeIn, fadeUp, staggerContainer } from '@/lib/motion'

const STEPS = [
  {
    n: '01',
    title: 'Choose your notes',
    body: 'Browse 21 notes across citrus, floral, woody, amber, spicy, fresh and gourmand families. Get AI suggestions based on your preferences.',
    accent: '#1E63C8',
  },
  {
    n: '02',
    title: 'Build with AI guidance',
    body: 'Layer notes intelligently with real-time AI recommendations. Avoid clashes, balance profiles, and create harmonious compositions.',
    accent: '#57B8F2',
  },
  {
    n: '03',
    title: 'Personalize the bottle',
    body: 'Pick size, concentration, bottle type, atomizer and label. The liquid colour shifts in real time as your blend evolves.',
    accent: '#1E63C8',
  },
  {
    n: '04',
    title: 'Order your fragrance',
    body: 'Every blend is validated for compatibility, priced transparently, and saved to your account to revisit any time.',
    accent: '#57B8F2',
  },
]

export function ProcessSteps() {
  return (
    <section
      aria-labelledby="process-heading"
      className="bg-[#F5F9FD] py-20 md:py-28"
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
            How it works
          </motion.p>
          <motion.h2
            id="process-heading"
            variants={fadeUp}
            className="mt-4 font-serif text-4xl font-medium leading-tight sm:text-5xl text-[#0E1B33]"
          >
            From a single note to your{' '}
            <em className="text-[#1E63C8]">signature scent.</em>
          </motion.h2>
        </motion.div>

        {/* Steps grid */}
        <motion.ol
          className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[#CCDFF0] bg-[#CCDFF0] sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer(0.08, 0.1)}
        >
          {STEPS.map(step => (
            <motion.li
              key={step.n}
              variants={fadeUp}
              whileHover={{
                y: -5,
                transition: { type: 'spring', stiffness: 220, damping: 20 },
              }}
              className="group relative flex flex-col overflow-hidden bg-[#FDFEFF] p-7 transition-colors duration-300 hover:bg-[#F5F9FD]"
            >
              {/* Hover accent line */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                style={{ backgroundColor: step.accent }}
              />
              <span
                className="origin-top-left font-serif text-5xl leading-none opacity-60 transition-all duration-400 group-hover:scale-110 group-hover:opacity-100"
                style={{ color: step.accent }}
              >
                {step.n}
              </span>
              <h3 className="mt-6 font-serif text-2xl text-[#0E1B33]">
                {step.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#5C728F]">
                {step.body}
              </p>
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
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1E63C8] transition-colors hover:text-[#0E1B33]"
          >
            Start building <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
