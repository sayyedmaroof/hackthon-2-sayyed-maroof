'use client'

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from 'framer-motion'
import {
  useCallback,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

/**
 * Interactive card surface: a cursor-tracked spotlight sheen with an
 * optional gentle 3D tilt. Drop it inside any container — server or
 * client tree — to add tactile depth without changing layout.
 */
export function SpotlightCard({
  children,
  className,
  tilt = false,
  spotlightColor = 'rgba(87, 184, 242, 0.17)',
}: {
  children: ReactNode
  className?: string
  /** Enable a subtle 3D tilt that follows the cursor */
  tilt?: boolean
  /** RGB(A) color of the cursor spotlight */
  spotlightColor?: string
}) {
  const x = useMotionValue(-1000)
  const y = useMotionValue(-1000)
  const rx = useSpring(0, { stiffness: 200, damping: 22 })
  const ry = useSpring(0, { stiffness: 200, damping: 22 })

  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${x}px ${y}px, ${spotlightColor}, transparent 72%)`

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      x.set(px)
      y.set(py)
      if (tilt) {
        ry.set(((px - rect.width / 2) / (rect.width / 2)) * 5)
        rx.set(((rect.height / 2 - py) / (rect.height / 2)) * 5)
      }
    },
    [tilt, x, y, rx, ry],
  )

  const handleMouseLeave = useCallback(() => {
    x.set(-1000)
    y.set(-1000)
    rx.set(0)
    ry.set(0)
  }, [x, y, rx, ry])

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tilt ? { rotateX: rx, rotateY: ry, transformPerspective: 900 } : undefined}
      className={cn('group/spot relative', className)}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px z-20 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{ background: spotlight }}
      />
      {children}
    </motion.div>
  )
}
