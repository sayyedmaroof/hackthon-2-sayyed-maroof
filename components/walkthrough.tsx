'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WalkthroughStep {
  title: string
  body: string
  /**
   * Optional `data-walkthrough` attribute value of the element to spotlight.
   * Omitted steps show a centered card without a spotlight.
   */
  target?: string
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
  /** The tooltip fits below the target. */
  below: boolean
}

interface Props {
  steps: WalkthroughStep[]
  /** localStorage key remembering whether the walkthrough has been seen. */
  storageKey: string
  /** Increment to replay the walkthrough from step 1 (e.g. a "Tour" button). */
  replayKey?: number
}

const SIDES = 16 // viewport gutter for the card
const GAP = 14 // space between spotlight and card
const CARD_MAX = 400 // max card width px

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readSeen(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === 'seen'
  } catch {
    return false
  }
}

function markSeen(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, 'seen')
  } catch {
    // Storage disabled — the tour simply reappears next visit.
  }
}

function findTargetRect(
  target?: string,
  cardHeight = 320,
): Rect | null {
  if (!target) return null
  const el = document.querySelector<HTMLElement>(
    `[data-walkthrough="${target}"]`,
  )
  if (!el) return null
  const r = el.getBoundingClientRect()
  // Hidden elements (e.g. desktop-only aside) have no box — fall back to center.
  if (r.width === 0 && r.height === 0) return null
  const roomBelow = window.innerHeight - r.bottom
  const roomAbove = r.top
  const fitsBelow = roomBelow >= cardHeight + GAP + SIDES
  const fitsAbove = roomAbove >= cardHeight + GAP + SIDES
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    // Prefer below, then above; if neither fits, take the roomier side and
    // let the vertical clamp keep the card on screen.
    below: fitsBelow ? true : !fitsAbove ? roomBelow >= roomAbove : false,
  }
}

function clampCardX(center: number, width: number) {
  return Math.min(
    Math.max(center, SIDES + width / 2),
    window.innerWidth - SIDES - width / 2,
  )
}

// ─── Walkthrough ─────────────────────────────────────────────────────────────

export function Walkthrough({
  steps,
  storageKey,
  replayKey = 0,
}: Props) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [cardHeight, setCardHeight] = useState(320) // pre-measure estimate
  const cardRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const mounted = useRef(false)

  const close = useCallback(() => {
    setOpen(false)
    markSeen(storageKey)
  }, [storageKey])

  const step = steps[index]

  // Auto-start on first visit
  useEffect(() => {
    if (readSeen(storageKey)) return
    const timer = setTimeout(() => setOpen(true), 700)
    return () => clearTimeout(timer)
  }, [storageKey])

  // Replay from the button in the page header
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (replayKey > 0) {
      setIndex(0)
      setOpen(true)
    }
  }, [replayKey])

  // Scroll the target of the active step into view
  useEffect(() => {
    if (!open || !step?.target) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document
      .querySelector(`[data-walkthrough="${step.target}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [open, index, step?.target])

  const measure = useCallback(() => {
    // Track the card's real height so placement accounts for the current step.
    if (cardRef.current && cardRef.current.offsetHeight > 0) {
      setCardHeight(cardRef.current.offsetHeight)
    }
    setRect(findTargetRect(step?.target, cardHeight))
  }, [step?.target, cardHeight])

  // Initial measure once the card mounts and layout settles
  useLayoutEffect(() => {
    if (!open) return
    measure()
    const raf = requestAnimationFrame(measure)
    const timer = setTimeout(measure, 350) // after smooth scroll / entrance animations
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [open, index, measure])

  // Keep the spotlight aligned on scroll & resize
  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [open, measure])

  // Keyboard controls
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') {
        index < steps.length - 1 ? setIndex(i => i + 1) : close()
      }
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, index, steps.length, close])

  // Focus the primary button so keyboard users land in the tour
  useEffect(() => {
    if (open) nextRef.current?.focus()
  }, [open, index])

  if (steps.length === 0) return null

  // SSR guard — `open` is false on the server, but sizes are still computed below.
  const vw = typeof window === 'undefined' ? 1024 : window.innerWidth
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight
  const cardWidth = Math.min(CARD_MAX, vw - SIDES * 2)
  const centered = !rect
  const cardX = centered
    ? (vw - cardWidth) / 2
    : clampCardX(rect.left + rect.width / 2, cardWidth)

  // Vertical placement — clamp the card fully inside the viewport so the tour
  // can never drift off-screen, even beside a tall card or an edge target.
  let cardTop: number
  if (centered) {
    cardTop = Math.max(SIDES, (vh - cardHeight) / 2)
  } else if (rect.below) {
    cardTop = Math.max(
      SIDES,
      Math.min(rect.top + rect.height + GAP, vh - SIDES - cardHeight),
    )
  } else {
    // Card sits above the target: cardTop is the card's top edge directly.
    cardTop = Math.max(rect.top - GAP - cardHeight, SIDES)
  }

  return (
    <>
      {/* Spotlight — huge box-shadow darkens everything except the target */}
      <AnimatePresence>
        {open && rect && (
          <motion.div
            key="spotlight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            aria-hidden="true"
            className="pointer-events-none fixed z-[60] transition-[top,left,width,height] duration-300 ease-out"
            style={{
              top: rect.top - 8,
              left: rect.left - 8,
              width: rect.width + 16,
              height: rect.height + 16,
              borderRadius: 20,
              boxShadow: '0 0 0 9999px rgba(5, 19, 52, 0.55)',
              outline: '2px solid rgba(30, 99, 200, 0.8)',
              outlineOffset: 2,
            }}
          />
        )}
      </AnimatePresence>

      {/* Step card */}
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            key={index}
            ref={cardRef}
            role="dialog"
            aria-label={`Walkthrough step ${index + 1} of ${steps.length}`}
            initial={{ opacity: 0, y: centered ? 0 : rect.below ? -8 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: centered ? 0 : rect.below ? 8 : -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[70] rounded-3xl border border-[#CCDFF0] bg-[#FDFEFF] p-5 shadow-[0_24px_60px_rgba(5,19,52,0.25)]"
            style={{
              top: cardTop,
              left: cardX,
              width: cardWidth,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-[#1E63C8]">
                Step {index + 1} of {steps.length}
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Skip walkthrough"
                className="mt-[-2px] rounded-full p-1 text-[#5C728F] transition-colors hover:bg-[#E4EEF8] hover:text-[#0E1B33]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <h2 className="mt-2 font-serif text-2xl text-[#0A1A52]">
              {step.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#5C728F]">
              {step.body}
            </p>

            {/* Progress dots */}
            <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    i === index
                      ? 'w-4 bg-[#1E63C8]'
                      : 'w-1.5 bg-[#CCDFF0]',
                  )}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={close}
                className="text-xs font-medium text-[#5C728F] transition-colors hover:text-[#0E1B33]"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => setIndex(i => i - 1)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#CCDFF0] bg-[#FDFEFF] px-4 py-2 text-sm font-medium text-[#5C728F] transition-colors hover:border-[#1E63C8]/40 hover:text-[#0E1B33]"
                  >
                    <ArrowLeft className="size-3.5" aria-hidden="true" /> Back
                  </button>
                )}
                <button
                  ref={nextRef}
                  type="button"
                  onClick={() =>
                    index < steps.length - 1
                      ? setIndex(i => i + 1)
                      : close()
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-[#1E63C8] px-5 py-2 text-sm font-medium text-[#F5F9FD] transition-colors hover:bg-[#154FB8]"
                >
                  {index < steps.length - 1 ? (
                    <>
                      Next <ArrowRight className="size-3.5" aria-hidden="true" />
                    </>
                  ) : (
                    'Finish'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
