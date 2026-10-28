/**
 * Shared Framer Motion variants and transition presets for ScentBuild Studio.
 * Use these consistently to maintain a coherent motion language across the design.
 */

import type { Variants } from 'framer-motion'

// ─── Transitions ────────────────────────────────────────────────────────────

export const ease = {
  // Smooth deceleration — good for entrances
  out: [0.16, 1, 0.3, 1] as const,
  // Smooth acceleration — good for exits
  in: [0.4, 0, 1, 1] as const,
  // Balanced — good for cross-fades
  inOut: [0.4, 0, 0.2, 1] as const,
} as const

export const spring = {
  gentle: { type: 'spring', stiffness: 180, damping: 30 },
  snappy: { type: 'spring', stiffness: 300, damping: 24 },
  soft:   { type: 'spring', stiffness: 100, damping: 20, mass: 1.2 },
} as const

// ─── Section / scroll reveal ────────────────────────────────────────────────

/** Fade up from 24px below */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.65, ease: ease.out } },
}

/** Fade up — slightly larger lift, slower — for primary headings */
export const fadeUpLarge: Variants = {
  hidden: { opacity: 0, y: 36 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.8, ease: ease.out } },
}

/** Fade in place (no Y movement) */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.6, ease: ease.out } },
}

/** Scale up from slightly smaller + fade */
export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.93 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.7, ease: ease.out } },
}

/** Slide in from left */
export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.7, ease: ease.out } },
}

/** Slide in from right */
export const slideRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.7, ease: ease.out } },
}

// ─── Stagger containers ──────────────────────────────────────────────────────

/**
 * Apply to a parent `motion.ul` / `motion.div` that wraps staggered children.
 * Children should use `fadeUp` or `fadeIn` as their own variant.
 */
export const staggerContainer = (stagger = 0.08, delayStart = 0): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: stagger,
      delayChildren: delayStart,
    },
  },
})

/** Typical stagger for landing sections */
export const sectionStagger = staggerContainer(0.1, 0.05)

/** Tight stagger for small items (pills, badges, facts) */
export const tightStagger = staggerContainer(0.06, 0)

// ─── Hero entrance ──────────────────────────────────────────────────────────

/** Orchestrates the staggered hero entrance sequence */
export const heroContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

export const heroBottle: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  show:   { opacity: 1, scale: 1,    y: 0, transition: { duration: 1.0, ease: ease.out, delay: 0.2 } },
}

// ─── Card hover ──────────────────────────────────────────────────────────────

export const cardHover = {
  rest:  { y: 0,  boxShadow: '0 2px 12px rgba(53,19,41,0.08)' },
  hover: { y: -4, boxShadow: '0 16px 40px rgba(53,19,41,0.18)', transition: spring.gentle },
}

// ─── Button interactions ─────────────────────────────────────────────────────

export const buttonTap = { scale: 0.97 }
export const buttonHover = { scale: 1.03 }

// ─── Floating decoration ─────────────────────────────────────────────────────

export const floatY = {
  animate: {
    y: [0, -10, 0],
    transition: { repeat: Infinity, duration: 5, ease: 'easeInOut' },
  },
}

export const floatYSlow = {
  animate: {
    y: [0, -6, 0],
    transition: { repeat: Infinity, duration: 7, ease: 'easeInOut' },
  },
}
