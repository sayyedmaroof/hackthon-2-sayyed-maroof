'use client'

import { motion, useScroll, useSpring } from 'framer-motion'

/**
 * Hairline reading-progress bar pinned to the very top of the viewport.
 * A cool detail that makes long pages feel alive and responsive.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.3,
  })

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-[#1E63C8] via-[#57B8F2] to-[#9AD6FF]"
      style={{ scaleX }}
    />
  )
}
