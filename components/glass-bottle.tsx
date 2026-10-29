'use client'

/**
 * GlassBottle v3 — Premium photorealistic SVG perfume bottle
 *
 * Design references: Chanel No.5, Dior Sauvage, Tom Ford Noir,
 * Creed Aventus, Maison Margiela Replica — all share these traits:
 *   - Clear thick-walled glass body, wider at bottom, tapering to neck
 *   - Distinct shoulder curve where body meets neck
 *   - Narrow cylindrical neck with collar ring
 *   - Rectangular/cylindrical premium cap with metallic sheen + knurling
 *   - Liquid visible through glass with natural light play
 *   - Strong left-side specular highlight (light source upper-left)
 *   - Soft right caustic / secondary reflection
 *   - Fresnel darkening on both glass edges
 *   - Thick base glass visible at bottom with light pooling
 *   - Paper label centered on body, softly cast-shadowed
 *
 * SVG strategy:
 *   - viewBox 200 × 420 — tall rectangular proportions
 *   - Classic ⇄ Designer silhouettes share one command template, so
 *     framer-motion can morph `d` between them with a spring
 *   - Bottle scale animates with size (30 / 50 / 100 ml), bottom-anchored
 *   - Liquid = colored rect clipped to inner shape, CSS-transitioned
 *   - 12+ glass highlight layers over the liquid + hover sheen sweep
 *   - feDropShadow + feGaussianBlur for depth and glow
 */

import { useId } from 'react'
import { motion } from 'framer-motion'
import { CONCENTRATION_OPTIONS } from '@/lib/pricing'
import { EMPTY_BLEND_COLOR } from '@/lib/scoring'
import type { BottleOptions, BottleSize } from '@/lib/types'
import { cn } from '@/lib/utils'

// ─── Label palette ──────────────────────────────────────────────────────────

const LABEL_PALETTE = {
  ivory:  { bg: '#F8F3EB', bg2: '#EDE4D2', text: '#2A1608', rule: '#1E63C8', sub: '#8B6A3A' },
  noir:   { bg: '#16100C', bg2: '#201610', text: '#F0EBE2', rule: '#57B8F2', sub: '#A08050' },
  copper: { bg: '#C4922A', bg2: '#D4A840', text: '#1A0C04', rule: '#7A4A10', sub: '#5A3008' },
}

// ─── Color math ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '')
  return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)]
}

function rgbToHex([r,g,b]: [number,number,number]): string {
  return '#'+[r,g,b].map(n=>Math.round(Math.min(255,Math.max(0,n))).toString(16).padStart(2,'0')).join('')
}

function adjustColor(hex: string, lightness: number, saturation = 1): string {
  const [r,g,b] = hexToRgb(hex)
  if (lightness > 1) {
    const t = lightness - 1
    return rgbToHex([r+(255-r)*t, g+(255-g)*t, b+(255-b)*t])
  }
  // Shift hue toward a more saturated version when darkening
  const mid = (r+g+b)/3
  const nr = mid + (r-mid)*saturation
  const ng = mid + (g-mid)*saturation
  const nb = mid + (b-mid)*saturation
  return rgbToHex([nr*lightness, ng*lightness, nb*lightness])
}

// ─── Bottle geometry ────────────────────────────────────────────────────────
// viewBox: 0 0 200 420 — light source upper-left (studio photography)
//
// Both silhouettes are expressed with the SAME command sequence
// (M, C, C, L, C, L, C, C, L, C, Z), so framer-motion can smoothly
// interpolate the `d` attribute between classic and designer shapes.

type PathNums = number[]

// flattened: M | C | C | L | C | L | C | C | L | C
const CLASSIC_OUTER_N: PathNums = [
  72,90,
  72,78, 78,72, 100,72,
  122,72, 128,78, 128,90,
  128,96,
  148,100, 154,112, 154,128,
  154,310,
  154,332, 140,340, 100,340,
  60,340, 46,332, 46,310,
  46,128,
  46,112, 52,100, 72,96,
]

const DESIGNER_OUTER_N: PathNums = [
  80,90,
  80,90, 90,90, 100,90,
  110,90, 120,90, 120,90,
  120,90,
  138,90, 148,100, 148,118,
  148,300,
  148,322, 136,340, 100,340,
  64,340, 52,322, 52,300,
  52,118,
  52,100, 62,90, 80,90,
]

// Inner clip — glass is ~5px thick on sides, ~8px at base.
// This is where the liquid lives. Same command sequence as the outer.
const CLASSIC_INNER_N: PathNums = [
  78,96,
  78,86, 84,82, 100,82,
  116,82, 122,86, 122,96,
  122,100,
  140,104, 146,116, 146,130,
  146,308,
  146,326, 134,334, 100,334,
  66,334, 54,326, 54,308,
  54,130,
  54,116, 60,104, 78,100,
]

const DESIGNER_INNER_N: PathNums = [
  84,98,
  84,98, 100,98, 100,98,
  108,98, 116,98, 116,98,
  116,98,
  132,98, 140,108, 140,122,
  140,298,
  140,318, 130,332, 100,332,
  70,332, 60,318, 60,298,
  60,122,
  60,108, 68,98, 84,98,
]

/** Render the flattened number stream as an SVG path with a fixed template. */
function toPath(n: PathNums): string {
  const c = (i: number) => ` C ${n[i]},${n[i+1]} ${n[i+2]},${n[i+3]} ${n[i+4]},${n[i+5]}`
  const l = (i: number) => ` L ${n[i]},${n[i+1]}`
  return (
    `M ${n[0]},${n[1]}` +
    c(2) + c(8) + l(14) + c(16) + l(22) + c(24) + c(30) + l(36) + c(38) +
    ' Z'
  )
}

// ─── Size scale ─────────────────────────────────────────────────────────────
/** Whole-bottle scale per ml size, anchored above the cast shadow. */
const SIZE_SCALE: Record<BottleSize, number> = { 30: 0.8, 50: 0.92, 100: 1.06 }

// ─── Fill level math ────────────────────────────────────────────────────────
// Interior liquid area: from y≈100 (below neck) to y≈332 (above thick base)

const LIQ_TOP    = 100  // top of liquid fill area (below neck join)
const LIQ_BOTTOM = 332  // bottom of interior
const LIQ_HEIGHT = LIQ_BOTTOM - LIQ_TOP

function liquidTopY(noteCount: number, maxNotes = 8): number {
  if (noteCount === 0) return LIQ_BOTTOM - LIQ_HEIGHT * 0.05  // tiny residue
  const t = Math.min(1, noteCount / maxNotes)
  // logarithmic fill: first few notes fill quickly, then slows
  const frac = 0.18 + Math.pow(t, 0.65) * 0.74
  return LIQ_BOTTOM - LIQ_HEIGHT * frac
}

// Slosh-like fill easing: slight overshoot so the liquid feels fluid
const LIQ_EASE = 'cubic-bezier(0.34, 1.28, 0.64, 1)'

// Spring used for all bottle-property morphs (shape, size)
const MORPH_SPRING = { type: 'spring', stiffness: 60, damping: 15, mass: 0.9 } as const

// Decorative bubble set — cx + relative depth inside the liquid column
const BUBBLES = [
  { cx: 84,  depth: 0.78, r: 1.5,  dur: '6.0s', delay: '0s'   },
  { cx: 104, depth: 0.62, r: 1.1,  dur: '7.6s', delay: '0.9s' },
  { cx: 113, depth: 0.88, r: 1.3,  dur: '6.8s', delay: '1.7s' },
]

// ─── Label name fitting ─────────────────────────────────────────────────────
// Luxury labels never print an ellipsis — the type wraps onto two balanced
// lines and scales so the full blend name always reads on the bottle.

const NAME_MAX_W  = 72    // usable text width between the label rules (x 64–136)
const NAME_CHAR_W = 0.52  // rough advance-width ratio of the serif face

function estimateNameWidth(text: string, fontSize: number): number {
  return text.length * NAME_CHAR_W * fontSize
}

function fitLabelName(rawName: string): { lines: string[]; fontSize: number } {
  const name = (rawName ?? '').trim()
  if (!name) return { lines: [], fontSize: 13.5 }

  // One strong line whenever it fits at full size
  if (estimateNameWidth(name, 13.5) <= NAME_MAX_W) {
    return { lines: [name], fontSize: 13.5 }
  }

  const words = name.split(/\s+/).filter(Boolean)

  // Wrap into two balanced lines (split where the longest half is shortest)
  let splitAt = 1
  if (words.length > 2) {
    let bestScore = Infinity
    for (let i = 1; i < words.length; i++) {
      const score = Math.max(
        words.slice(0, i).join(' ').length,
        words.slice(i).join(' ').length,
      )
      if (score < bestScore) {
        bestScore = score
        splitAt = i
      }
    }
  }
  const lines = words.length > 1
    ? [words.slice(0, splitAt).join(' '), words.slice(splitAt).join(' ')]
    : [name]

  const longest = Math.max(...lines.map(l => l.length))
  // Cap stacked type slightly smaller so two lines breathe on the paper,
  // but never below a readable floor — below that, `textLength` glyph
  // squeezing on the whisper-long lines takes over in the render step.
  const fontSize = Math.max(
    8.5,
    Math.min(
      words.length > 1 ? 12 : 13.5,
      NAME_MAX_W / (longest * NAME_CHAR_W),
    ),
  )
  return { lines, fontSize }
}

// ─── Component ──────────────────────────────────────────────────────────────

interface GlassBottleProps {
  name: string
  color?: string | null
  bottle: BottleOptions
  noteCount?: number
  className?: string
}

export function GlassBottle({ name, color, bottle, noteCount = 0, className }: GlassBottleProps) {
  const uid = useId().replace(/:/g, '')

  const liquid      = color ?? EMPTY_BLEND_COLOR
  const liqLight    = adjustColor(liquid, 1.45)  // lighter top — refracted light
  const liqMid      = adjustColor(liquid, 1.05, 1.2)
  const liqDeep     = adjustColor(liquid, 0.72, 1.15)  // darker deep base
  const liqEdge     = adjustColor(liquid, 0.60, 1.3)   // darkest edge shadow

  const label       = LABEL_PALETTE[bottle.labelStyle]
  const metal       = bottle.atomizerMaterial === 'metal'
  const isDesigner  = bottle.bottleType === 'designer'
  const outerD      = toPath(isDesigner ? DESIGNER_OUTER_N : CLASSIC_OUTER_N)
  const innerD      = toPath(isDesigner ? DESIGNER_INNER_N  : CLASSIC_INNER_N)
  const conc        = CONCENTRATION_OPTIONS.find(o => o.value === bottle.concentration)?.label ?? ''
  const nameFit     = fitLabelName(name)
  const liqY        = liquidTopY(noteCount)
  const pressurized = bottle.atomizerType === 'pressurized'
  const filled      = noteCount > 0

  // Cap sizing — tall rectangular cap like luxury bottles
  const CAP_X = 70, CAP_Y = 16, CAP_W = 60, CAP_H = 56, CAP_R = isDesigner ? 3 : 8
  // Collar ring between cap and body
  const COLLAR_Y = CAP_Y + CAP_H
  const COLLAR_H = 18

  return (
    <svg
      viewBox="0 0 200 420"
      role="img"
      aria-label={`${isDesigner ? 'Designer' : 'Classic'} ${bottle.size}ml bottle: ${name}`}
      className={cn('h-auto w-full select-none', className)}
      overflow="visible"
    >
      <defs>
        {/* ════ LIQUID GRADIENTS ════ */}

        {/* Main vertical fill — top bright, deep base dark */}
        <linearGradient id={`liq-v-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={liqLight} stopOpacity="0.92"/>
          <stop offset="22%"  stopColor={liqMid}   stopOpacity="0.96"/>
          <stop offset="70%"  stopColor={liquid}   stopOpacity="1"/>
          <stop offset="100%" stopColor={liqDeep}  stopOpacity="1"/>
        </linearGradient>

        {/* Horizontal shading — dark left edge, bright centre-left, dark right */}
        <linearGradient id={`liq-h-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={liqEdge}  stopOpacity="0.65"/>
          <stop offset="12%"  stopColor="#000000"  stopOpacity="0"/>
          <stop offset="42%"  stopColor="#ffffff"  stopOpacity="0.08"/>
          <stop offset="65%"  stopColor="#000000"  stopOpacity="0"/>
          <stop offset="88%"  stopColor="#000000"  stopOpacity="0.08"/>
          <stop offset="100%" stopColor={liqEdge}  stopOpacity="0.55"/>
        </linearGradient>

        {/* Meniscus top surface — bright reflection line */}
        <linearGradient id={`liq-top-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.55"/>
          <stop offset="60%"  stopColor="#ffffff" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* ════ GLASS GRADIENTS ════ */}

        {/* Primary specular — bright left-side highlight (light source upper-left) */}
        <linearGradient id={`g-spec-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.88"/>
          <stop offset="8%"   stopColor="#ffffff" stopOpacity="0.55"/>
          <stop offset="20%"  stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* Secondary caustic — soft right highlight */}
        <linearGradient id={`g-caus-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="60%"  stopColor="#ffffff" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.40"/>
        </linearGradient>

        {/* Right fresnel — thin dark rim on the far edge (glass thickness) */}
        <linearGradient id={`fresnel-r-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#0A1A2A" stopOpacity="0"/>
          <stop offset="70%"  stopColor="#0A1A2A" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#0A1A2A" stopOpacity="0.30"/>
        </linearGradient>

        {/* Left fresnel — subtle dark rim behind the specular */}
        <linearGradient id={`fresnel-l-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#0A1A2A" stopOpacity="0.20"/>
          <stop offset="8%"   stopColor="#0A1A2A" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#0A1A2A" stopOpacity="0"/>
        </linearGradient>

        {/* Glass body tint — very faint cool blue-grey over center */}
        <linearGradient id={`g-body-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#D4E8F4" stopOpacity="0.22"/>
          <stop offset="20%"  stopColor="#EAF4FA" stopOpacity="0.06"/>
          <stop offset="50%"  stopColor="#F4FAFE" stopOpacity="0.02"/>
          <stop offset="80%"  stopColor="#EAF4FA" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#C8DDE8" stopOpacity="0.20"/>
        </linearGradient>

        {/* Shoulder highlight — bright band at top of body */}
        <linearGradient id={`g-shldr-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.62"/>
          <stop offset="40%"  stopColor="#ffffff" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* Base thick-glass brightness */}
        <linearGradient id={`g-base-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="55%"  stopColor="#ffffff" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.40"/>
        </linearGradient>

        {/* Designer facet lines — vertical stroke fading top & bottom */}
        <linearGradient id={`facet-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="30%"  stopColor="#ffffff" stopOpacity="0.42"/>
          <stop offset="70%"  stopColor="#ffffff" stopOpacity="0.30"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* Centre narrow vertical shimmer */}
        <linearGradient id={`g-shin-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.38"/>
          <stop offset="35%"  stopColor="#ffffff" stopOpacity="0.10"/>
          <stop offset="70%"  stopColor="#ffffff" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.14"/>
        </linearGradient>

        {/* Hover sheen sweep — diagonal light streak across the glass */}
        <linearGradient id={`sheen-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="45%"  stopColor="#ffffff" stopOpacity="0.26"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* ════ LABEL GRADIENTS ════ */}

        {/* Paper sheen — subtle top light, bottom shade */}
        <linearGradient id={`paper-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.22"/>
          <stop offset="45%"  stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.07"/>
        </linearGradient>

        {/* Cylinder shading — paper wraps around the bottle's convex face */}
        <linearGradient id={`label-cyl-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#000000" stopOpacity="0.16"/>
          <stop offset="10%"  stopColor="#000000" stopOpacity="0.03"/>
          <stop offset="28%"  stopColor="#ffffff" stopOpacity="0.10"/>
          <stop offset="55%"  stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="88%"  stopColor="#000000" stopOpacity="0.05"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18"/>
        </linearGradient>

        {/* Vertical light falloff — brighter top grade, faint base darkening */}
        <linearGradient id={`vshade-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.08"/>
          <stop offset="18%"  stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="80%"  stopColor="#0A1A2A" stopOpacity="0"/>
          <stop offset="100%" stopColor="#0A1A2A" stopOpacity="0.12"/>
        </linearGradient>

        {/* Liquid surface line — crisp meniscus highlight across the walls */}
        <linearGradient id={`liq-line-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.05"/>
          <stop offset="16%"  stopColor="#ffffff" stopOpacity="0.55"/>
          <stop offset="50%"  stopColor="#ffffff" stopOpacity="0.22"/>
          <stop offset="84%"  stopColor="#ffffff" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08"/>
        </linearGradient>

        {/* Refraction band — liquid tint bleeding up the glass above the surface */}
        <linearGradient id={`liq-wall-${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor={liqLight} stopOpacity="0.30"/>
          <stop offset="100%" stopColor={liqLight} stopOpacity="0"/>
        </linearGradient>

        {/* Neck glass shading — cool glass visible below the collar */}
        <linearGradient id={`neckg-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#A9C2CE" stopOpacity="0.38"/>
          <stop offset="18%"  stopColor="#F4FBFF" stopOpacity="0.10"/>
          <stop offset="55%"  stopColor="#FFFFFF" stopOpacity="0.04"/>
          <stop offset="85%"  stopColor="#A9C2CE" stopOpacity="0.26"/>
          <stop offset="100%" stopColor="#86A2B0" stopOpacity="0.42"/>
        </linearGradient>

        {/* Ground shadow radial falloff — studio-table contact shading */}
        <radialGradient id={`ground-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#140804" stopOpacity="0.40"/>
          <stop offset="55%"  stopColor="#140804" stopOpacity="0.16"/>
          <stop offset="100%" stopColor="#140804" stopOpacity="0"/>
        </radialGradient>

        {/* Soft-blur — out-of-focus highlights & cast shadows */}
        <filter id={`soft-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2"/>
        </filter>

        {/* ════ CAP GRADIENTS ════ */}

        {/* Metallic copper cap — brushed horizontal banding */}
        <linearGradient id={`cap-${uid}`} x1="0" y1="0" x2="1" y2="0">
          {metal ? (
            <>
              <stop offset="0%"   stopColor="#3E2006"/>
              <stop offset="14%"  stopColor="#7A4418"/>
              <stop offset="30%"  stopColor="#8A5020"/>
              <stop offset="44%"  stopColor="#D4946A"/>
              <stop offset="52%"  stopColor="#F0BE8C"/>
              <stop offset="62%"  stopColor="#C87840"/>
              <stop offset="80%"  stopColor="#7A4418"/>
              <stop offset="100%" stopColor="#3E2006"/>
            </>
          ) : (
            <>
              <stop offset="0%"   stopColor="#0A0806"/>
              <stop offset="25%"  stopColor="#1E1610"/>
              <stop offset="50%"  stopColor="#2C2018"/>
              <stop offset="75%"  stopColor="#1A1208"/>
              <stop offset="100%" stopColor="#0A0806"/>
            </>
          )}
        </linearGradient>

        {/* Cap top chamfer — bright catch light */}
        <linearGradient id={`cap-top-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity={metal ? 0.55 : 0.18}/>
          <stop offset="30%"  stopColor="#ffffff" stopOpacity={metal ? 0.20 : 0.06}/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* Cap gloss — vertical environment reflection streak near the crown */}
        <linearGradient id={`cap-gloss-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="46%"  stopColor="#ffffff" stopOpacity={metal ? 0.28 : 0.12}/>
          <stop offset="52%"  stopColor="#ffffff" stopOpacity={metal ? 0.55 : 0.20}/>
          <stop offset="58%"  stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* Collar / neck — material follows the atomizer choice */}
        <linearGradient id={`collar-${uid}`} x1="0" y1="0" x2="1" y2="0">
          {metal ? (
            <>
              <stop offset="0%"   stopColor="#5A3410" stopOpacity="0.92"/>
              <stop offset="28%"  stopColor="#A87A44" stopOpacity="0.95"/>
              <stop offset="55%"  stopColor="#E8C088" stopOpacity="1.00"/>
              <stop offset="80%"  stopColor="#9A6C34" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#5A3410" stopOpacity="0.92"/>
            </>
          ) : (
            <>
              <stop offset="0%"   stopColor="#14100C" stopOpacity="0.92"/>
              <stop offset="30%"  stopColor="#2A211A" stopOpacity="0.95"/>
              <stop offset="55%"  stopColor="#3C3026" stopOpacity="1.00"/>
              <stop offset="80%"  stopColor="#241C14" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#100C08" stopOpacity="0.92"/>
            </>
          )}
        </linearGradient>

        {/* ════ CLIP PATHS ════ */}
        <clipPath id={`clip-inner-${uid}`}>
          <motion.path initial={false} animate={{ d: innerD }} transition={MORPH_SPRING}/>
        </clipPath>
        <clipPath id={`clip-outer-${uid}`}>
          <motion.path initial={false} animate={{ d: outerD }} transition={MORPH_SPRING}/>
        </clipPath>
        <clipPath id={`clip-cap-${uid}`}>
          <rect x={CAP_X} y={CAP_Y} width={CAP_W} height={CAP_H} rx={CAP_R}/>
        </clipPath>
        <clipPath id={`clip-label-${uid}`}>
          <rect x="56" y="208" width="88" height="76" rx="2"/>
        </clipPath>

        {/* ════ FILTERS ════ */}

        {/* Bottle drop shadow */}
        <filter id={`shadow-${uid}`} x="-25%" y="-8%" width="150%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur"/>
          <feOffset dx="4" dy="14" result="offset"/>
          <feFlood floodColor="#1A0A04" floodOpacity="0.35" result="color"/>
          <feComposite in="color" in2="offset" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Liquid color glow — soft ambient around bottle base */}
        <filter id={`glow-${uid}`} x="-50%" y="-20%" width="200%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur"/>
          <feColorMatrix in="blur" type="saturate" values="2.2" result="sat"/>
          <feMerge>
            <feMergeNode in="sat"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Label cast shadow — soft, close to the glass */}
        <filter id={`label-shadow-${uid}`} x="-25%" y="-30%" width="150%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur"/>
          <feOffset dy="2.5" result="offset"/>
          <feFlood floodColor="#1A0A04" floodOpacity="0.30" result="color"/>
          <feComposite in="color" in2="offset" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

      </defs>

      {/* ── Studio floor: soft wide ground shadow ─────────────────────────── */}
      <ellipse cx="102" cy="394" rx="72" ry="14" fill={`url(#ground-${uid})`}/>
      {/* ── Ambient colored glow under bottle (matches liquid) ────────────── */}
      <ellipse
        cx="100" cy="394"
        rx="56" ry="10"
        fill={liquid}
        opacity="0.20"
        style={{ transition: 'fill 800ms ease, opacity 600ms ease' }}
      />
      {/* Contact shadow — tight dark core */}
      <ellipse
        cx="104" cy="392"
        rx="46" ry="7"
        fill="#140A06"
        opacity="0.32"
        style={{ filter: `url(#soft-${uid})` }}
      />

      {/* ══ Everything below scales with the chosen ml size, bottom-anchored ══ */}
      <motion.g
        initial={false}
        animate={{ scale: SIZE_SCALE[bottle.size] }}
        transition={MORPH_SPRING}
        style={{ transformBox: 'view-box', transformOrigin: '100px 398px' }}
      >

        {/* ── Collar / neck ring ───────────────────────────────────────────── */}
        {/* Sits between cap and bottle body — finished to match the atomizer */}
        <rect
          x="76" y={COLLAR_Y - 2}
          width="48" height={COLLAR_H + 2}
          rx={metal ? 3 : 4}
          fill={`url(#collar-${uid})`}
        />
        {/* Collar highlight line */}
        <line
          x1="80" y1={COLLAR_Y + 1}
          x2="120" y2={COLLAR_Y + 1}
          stroke="#ffffff"
          strokeWidth="1"
          strokeOpacity={metal ? 0.45 : 0.16}
          strokeLinecap="round"
        />
        {/* Collar base separator */}
        <line
          x1="76" y1={COLLAR_Y + COLLAR_H}
          x2="124" y2={COLLAR_Y + COLLAR_H}
          stroke="#00000040"
          strokeWidth="1.5"
        />

        {/* Pressurized pump ring — visible only with the fine-mist system */}
        {pressurized && (
          <rect
            x="68" y={COLLAR_Y + 4}
            width="64" height="8"
            rx="3"
            fill={`url(#cap-${uid})`}
            opacity="0.80"
          />
        )}

        {/* ── Cap ───────────────────────────────────────────────────────────── */}
        {/* Main cap body */}
        <rect
          x={CAP_X} y={CAP_Y}
          width={CAP_W} height={CAP_H}
          rx={CAP_R}
          fill={`url(#cap-${uid})`}
        />
        {/* Cap top-chamfer highlight */}
        <rect
          x={CAP_X} y={CAP_Y}
          width={CAP_W} height={CAP_H * 0.45}
          rx={CAP_R}
          fill={`url(#cap-top-${uid})`}
        />
        {/* Knurled grip band — fine vertical ridges on the metal cap */}
        {metal && (
          <g clipPath={`url(#clip-cap-${uid})`}>
            {Array.from({ length: 14 }).map((_, i) => (
              <line
                key={i}
                x1={CAP_X + 3 + i * 3.9}
                y1={CAP_Y + 6}
                x2={CAP_X + 3 + i * 3.9}
                y2={CAP_Y + CAP_H - 6}
                stroke={i % 2 === 0 ? '#F2C88C' : '#3A1F08'}
                strokeWidth="0.8"
                strokeOpacity="0.30"
              />
            ))}
          </g>
        )}
        {/* Cap top lip — specular ellipse for a machined 3D crown */}
        <ellipse
          cx={CAP_X + CAP_W / 2}
          cy={CAP_Y + 3.5}
          rx="26" ry="4"
          fill="#ffffff"
          fillOpacity={metal ? 0.30 : 0.10}
        />
        {/* Engraved horizontal line on cap (luxury detail) */}
        <line
          x1={CAP_X + 6} y1={CAP_Y + CAP_H * 0.55}
          x2={CAP_X + CAP_W - 6} y2={CAP_Y + CAP_H * 0.55}
          stroke="#ffffff"
          strokeWidth="0.75"
          strokeOpacity={metal ? 0.28 : 0.10}
          strokeLinecap="round"
        />
        {/* Cap sharp specular edge — left side */}
        <rect
          x={CAP_X} y={CAP_Y}
          width="6" height={CAP_H}
          rx={CAP_R}
          fill="#ffffff"
          fillOpacity={metal ? 0.30 : 0.08}
          clipPath={`url(#clip-cap-${uid})`}
        />
        {/* Cap right shadow edge */}
        <rect
          x={CAP_X + CAP_W - 6} y={CAP_Y}
          width="6" height={CAP_H}
          rx={CAP_R}
          fill="#00000060"
          clipPath={`url(#clip-cap-${uid})`}
        />
        {/* Cap gloss — vertical environment reflection streak */}
        <rect
          x={CAP_X + CAP_W * 0.40} y={CAP_Y}
          width={CAP_W * 0.18} height={CAP_H}
          rx={CAP_R * 0.5}
          fill={`url(#cap-gloss-${uid})`}
          clipPath={`url(#clip-cap-${uid})`}
        />
        {/* Machined bottom lip — dark edge with a bright ridge just above */}
        <line
          x1={CAP_X + 4} y1={CAP_Y + CAP_H - 2.5}
          x2={CAP_X + CAP_W - 4} y2={CAP_Y + CAP_H - 2.5}
          stroke="#000000"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <line
          x1={CAP_X + 4} y1={CAP_Y + CAP_H - 4.5}
          x2={CAP_X + CAP_W - 4} y2={CAP_Y + CAP_H - 4.5}
          stroke="#ffffff"
          strokeOpacity={metal ? 0.30 : 0.10}
          strokeWidth="0.7"
          strokeLinecap="round"
        />
        {/* Cap casts a soft shadow onto the glass shoulders */}
        <rect
          x={CAP_X + 6}
          y={COLLAR_Y + COLLAR_H - 1}
          width={CAP_W - 12}
          height="10"
          rx="5"
          fill="#1A0A04"
          opacity="0.15"
          style={{ filter: `url(#soft-${uid})` }}
        />

        {/* ── BOTTLE BODY ───────────────────────────────────────────────────── */}
        <g filter={`url(#shadow-${uid})`}>

          {/* === LAYER 1: Glass outer shell — faint cool tint === */}
          {/* Makes glass visible against light backgrounds */}
          <motion.path
            initial={false}
            animate={{ d: outerD }}
            transition={MORPH_SPRING}
            d={outerD}
            fill="#D8EAF2"
            fillOpacity="0.12"
            stroke="none"
          />

          {/* Neck glass shading just below the collar */}
          <rect
            x="70" y="86" width="60" height="14"
            fill={`url(#neckg-${uid})`}
            clipPath={`url(#clip-outer-${uid})`}
          />
          {/* Soft ambient occlusion where the liquid body meets the shoulder */}
          <ellipse
            cx="100" cy="112" rx="42" ry="8"
            fill="#0A1A2A"
            opacity="0.07"
            clipPath={`url(#clip-outer-${uid})`}
          />

          {/* === LAYER 2: LIQUID — clipped to inner glass wall === */}
          <g clipPath={`url(#clip-inner-${uid})`}>

            {/* Liquid vertical gradient fill */}
            <rect
              x="0" y={liqY}
              width="200" height="420"
              fill={`url(#liq-v-${uid})`}
              style={{
                transition: `y 850ms ${LIQ_EASE}, fill 650ms ease`,
              }}
            />

            {/* Liquid horizontal shading (edge darkening + centre glow) */}
            <rect
              x="0" y={liqY}
              width="200" height="420"
              fill={`url(#liq-h-${uid})`}
              style={{ transition: `y 850ms ${LIQ_EASE}` }}
            />

            {/* Dark band hugging the under-surface of the liquid */}
            <ellipse
              cx="100"
              cy={liqY + 9}
              rx="42" ry="4.5"
              fill={liqDeep}
              opacity="0.32"
              style={{ transition: `cy 850ms ${LIQ_EASE}` }}
            />

            {/* Meniscus — bright curved surface at liquid top */}
            <ellipse
              cx="100"
              cy={liqY + 3}
              rx="38" ry="5"
              fill={`url(#liq-top-${uid})`}
              style={{ transition: `cy 850ms ${LIQ_EASE}` }}
            />

            {/* Crisp surface line where the liquid meets the glass walls */}
            {filled && (
              <rect
                x="54" y={liqY + 1.5}
                width="92" height="1.6"
                fill={`url(#liq-line-${uid})`}
                style={{ transition: `y 850ms ${LIQ_EASE}` }}
              />
            )}

            {/* Refraction band — tint bleeding up the glass above the surface */}
            {filled && (
              <rect
                x="0" y={liqY - 16}
                width="200" height="16"
                fill={`url(#liq-wall-${uid})`}
                style={{ transition: `y 850ms ${LIQ_EASE}` }}
              />
            )}

            {/* Caustic light spots + bottom pooling — only once there is
                liquid to refract through */}
            {filled && (
              <>
                {/* Caustic light spot inside liquid — refraction pattern */}
                <ellipse
                  cx="74" cy="240"
                  rx="7" ry="24"
                  fill="#ffffff"
                  fillOpacity="0.12"
                />

                {/* Second smaller caustic */}
                <ellipse
                  cx="130" cy="190"
                  rx="3" ry="14"
                  fill="#ffffff"
                  fillOpacity="0.07"
                />

                {/* Light pooling at the bottom of the liquid — refraction through
                    the thick base collects into a bright glow behind the glass */}
                <ellipse
                  cx="100" cy="320"
                  rx="32" ry="8"
                  fill={liqLight}
                  opacity="0.30"
                />
              </>
            )}

            {/* Suspended micro-bubbles drift slowly beneath the surface */}
            {filled && BUBBLES.map((b, i) => {
              const by = liqY + (LIQ_BOTTOM - liqY) * b.depth
              return (
                <g
                  key={i}
                  className="bottle-bubble"
                  style={{ animationDuration: b.dur, animationDelay: b.delay }}
                >
                  <circle
                    cx={b.cx}
                    cy={by}
                    r={b.r}
                    fill="#ffffff"
                    opacity="0.16"
                    style={{ transition: `cy 850ms ${LIQ_EASE}` }}
                  />
                </g>
              )
            })}

          </g>

          {/* Pump tube — faint straw dipping from the neck into the liquid */}
          <rect
            x="96.75" y="74"
            width="2.5" height="252"
            rx="1.25"
            fill="#ffffff"
            opacity="0.09"
          />
          <line
            x1="99.9" y1="76"
            x2="99.9" y2="324"
            stroke="#0A1A2A"
            strokeWidth="0.6"
            strokeOpacity="0.07"
          />

          {/* === LAYER 3: Glass body tint overlay === */}
          {/* Sits above liquid — gives glass its slightly cool cast */}
          <motion.path
            initial={false}
            animate={{ d: outerD }}
            transition={MORPH_SPRING}
            d={outerD}
            fill={`url(#g-body-${uid})`}
          />

          {/* === LAYER 4: LEFT EDGE SPECULAR ===
              This is the key realism element.
              Real glass bottles always have a very bright narrow highlight
              on the left edge from the studio light source (upper left). */}
          <rect
            x="46" y="92"
            width="14" height="240"
            rx="5"
            fill={`url(#g-spec-${uid})`}
            clipPath={`url(#clip-outer-${uid})`}
          />

          {/* === LAYER 5: Right caustic / secondary reflection === */}
          <rect
            x="136" y="110"
            width="18" height="205"
            rx="5"
            fill={`url(#g-caus-${uid})`}
            clipPath={`url(#clip-outer-${uid})`}
          />

          {/* === LAYER 5b: soft out-of-focus specular streak ===
              Real glass highlights never ride alone — a wider blurred twin
              smears along the wall like a long-exposure catch light. */}
          <rect
            x="59" y="108" width="7" height="216" rx="3.5"
            fill="#ffffff" opacity="0.20"
            clipPath={`url(#clip-outer-${uid})`}
            style={{ filter: `url(#soft-${uid})` }}
          />

          {/* === LAYER 6: Fresnel edge darkening — thin rims both sides === */}
          <rect
            x="146" y="96"
            width="10" height="242"
            rx="4"
            fill={`url(#fresnel-r-${uid})`}
            clipPath={`url(#clip-outer-${uid})`}
          />
          <rect
            x="44" y="96"
            width="10" height="242"
            rx="4"
            fill={`url(#fresnel-l-${uid})`}
            clipPath={`url(#clip-outer-${uid})`}
          />

          {/* === LAYER 7: Designer facet lines ===
              Fades in for the faceted flacon — subtle optical edges */}
          <g
            clipPath={`url(#clip-outer-${uid})`}
            style={{ opacity: isDesigner ? 1 : 0, transition: 'opacity 600ms ease' }}
          >
            {([[66, 0.30], [82, 0.16], [118, 0.16], [134, 0.30]] as const).map(([x, o]) => (
                <line
                  key={x}
                  x1={x} y1={112}
                  x2={x} y2={296}
                  stroke={`url(#facet-${uid})`}
                  strokeOpacity={o}
                  strokeWidth="1.2"
                />
              ))}
          </g>

          {/* === LAYER 8: Shoulder highlight — bright top arc === */}
          <rect
            x="48" y="86"
            width="104" height="38"
            rx="12"
            fill={`url(#g-shldr-${uid})`}
            clipPath={`url(#clip-outer-${uid})`}
          />

          {/* === LAYER 9: Base thick-glass brightness === */}
          {/* Real glass is thicker at the base — bright bottom rim */}
          <rect
            x="48" y="316"
            width="104" height="26"
            rx="4"
            fill={`url(#g-base-${uid})`}
            clipPath={`url(#clip-outer-${uid})`}
          />
          {/* Base punt — thick glass reads as a soft ellipse */}
          <ellipse
            cx="100" cy="331"
            rx="50" ry="5.5"
            fill="#ffffff"
            opacity="0.10"
            clipPath={`url(#clip-outer-${uid})`}
          />

          {/* === LAYER 10: Central vertical shimmer stripe === */}
          {/* The "camera artifact" — narrow bright column through glass centre */}
          <rect
            x="94" y="100"
            width="8" height="220"
            rx="3"
            fill={`url(#g-shin-${uid})`}
            clipPath={`url(#clip-outer-${uid})`}
          />

          {/* === LAYER 11: Hover sheen sweep ===
              A diagonal light streak that glides across the glass when the
              cursor is over the bottle stage (see globals.css). */}
          <g clipPath={`url(#clip-outer-${uid})`} aria-hidden="true">
            <g className="bottle-sheen">
              <rect
                x="84" y="64"
                width="30" height="296"
                rx="14"
                fill={`url(#sheen-${uid})`}
                transform="rotate(14 100 210)"
              />
            </g>
          </g>

          {/* === LAYER 11b: vertical light falloff ===
              A single studio-light grade over the entire silhouette —
              slightly brighter crown, faint darkening at the base. */}
          <rect
            x="44" y="86" width="112" height="256"
            fill={`url(#vshade-${uid})`}
            clipPath={`url(#clip-outer-${uid})`}
          />

          {/* === LAYER 12: Glass edge stroke ===
              Crisp outline — makes the glass silhouette pop */}
          <motion.path
            initial={false}
            animate={{ d: outerD }}
            transition={MORPH_SPRING}
            d={outerD}
            fill="none"
            stroke="#B8CED8"
            strokeWidth="1.2"
            strokeOpacity="0.55"
          />
          {/* Inner glass wall edge stroke — shows wall thickness */}
          <motion.path
            initial={false}
            animate={{ d: innerD }}
            transition={MORPH_SPRING}
            d={innerD}
            fill="none"
            stroke="#D0E4EE"
            strokeWidth="0.6"
            strokeOpacity="0.25"
          />

          {/* ═══ LABEL ══════════════════════════════════════════════════════
              Softly cast-shadowed paper with a gentle top sheen + embossed
              inner frame. The pump tube tucks in behind it. */}
          <g filter={`url(#label-shadow-${uid})`}>
            <rect x="56" y="208" width="88" height="76" rx="2" fill={label.bg}/>
            <rect x="56" y="208" width="88" height="76" rx="2" fill={label.bg2} fillOpacity="0.35"/>
            <rect x="56" y="208" width="88" height="76" rx="2" fill={`url(#paper-${uid})`}/>
            {/* Embossed inner frame */}
            <rect
              x="60" y="212"
              width="80" height="68"
              rx="1.5"
              fill="none"
              stroke={bottle.labelStyle === 'noir' ? '#ffffff' : '#000000'}
              strokeOpacity={bottle.labelStyle === 'noir' ? 0.10 : 0.08}
              strokeWidth="0.8"
            />
            {/* Top rule */}
            <line x1="64" y1="220" x2="136" y2="220" stroke={label.rule} strokeWidth="0.8"/>
            {/* Brand name — auto-fit: wraps to two balanced lines and scales
                so the full name always shows. Per-line `textLength` with
                glyph squeezing is a last resort for very long single words. */}
            {nameFit.lines.map((line, i) => {
              const stacked = nameFit.lines.length > 1
              const baseY = stacked ? (i === 0 ? 236 : 248) : 243
              const needsSqueeze =
                estimateNameWidth(line, nameFit.fontSize) > NAME_MAX_W
              return (
                <text
                  key={i}
                  x="100"
                  y={baseY}
                  textAnchor="middle"
                  fill={label.text}
                  textLength={needsSqueeze ? NAME_MAX_W : undefined}
                  lengthAdjust={needsSqueeze ? 'spacingAndGlyphs' : undefined}
                  style={{
                    fontFamily: 'var(--font-cormorant), Georgia, serif',
                    fontSize: nameFit.fontSize,
                    fontWeight: 600,
                  }}
                >
                  {line}
                </text>
              )
            })}
            {/* Concentration */}
            <text
              x="100" y={nameFit.lines.length > 1 ? 258.5 : 256}
              textAnchor="middle"
              fill={label.sub}
              style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 5.5, letterSpacing: 1.8 }}
            >
              {conc.toUpperCase()}
            </text>
            {/* Bottom rule */}
            <line x1="64" y1="264" x2="136" y2="264" stroke={label.rule} strokeWidth="0.8"/>
            {/* Size line */}
            <text
              x="100" y="273"
              textAnchor="middle"
              fill={label.sub}
              style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 5, letterSpacing: 1.6 }}
            >
              {`${bottle.size} ML  ·  SCENTBUILD`}
            </text>
            {/* Cylinder shading — wraps the paper around the convex glass face */}
            <g clipPath={`url(#clip-label-${uid})`}>
              <rect x="56" y="208" width="88" height="76" fill={`url(#label-cyl-${uid})`}/>
            </g>
          </g>

        </g>
      </motion.g>
    </svg>
  )
}
