'use client'

/**
 * GlassBottle v2 — Photorealistic SVG perfume bottle
 *
 * Design references: Chanel No.5, Dior Sauvage, Tom Ford Noir,
 * Creed Aventus, Maison Margiela Replica — all share these traits:
 *   - Clear thick-walled glass body, wider at bottom, tapering to neck
 *   - Distinct shoulder curve where body meets neck
 *   - Narrow cylindrical neck with collar ring
 *   - Rectangular/cylindrical premium cap with metallic sheen
 *   - Liquid visible through glass with natural light play
 *   - Strong left-side specular highlight (light source upper-left)
 *   - Soft right caustic / secondary reflection
 *   - Thick base glass visible at bottom
 *   - Paper label centered on body
 *
 * SVG strategy:
 *   - viewBox 200 × 420 — tall rectangular proportions
 *   - Body path: smooth cubic Bézier curves for organic glass silhouette
 *   - Inner clip path slightly inset for glass wall thickness
 *   - Liquid = colored rect clipped to inner shape, CSS-transitioned
 *   - 9 glass highlight layers over the liquid
 *   - feDropShadow + feGaussianBlur for depth and glow
 */

import { useId } from 'react'
import { CONCENTRATION_OPTIONS } from '@/lib/pricing'
import { EMPTY_BLEND_COLOR } from '@/lib/scoring'
import type { BottleOptions } from '@/lib/types'
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
// viewBox: 0 0 200 420
// Light source: upper-left (simulates studio photography)

// OUTER glass silhouette — classic rectangular perfume bottle
// Wide at shoulders, slight taper, clean corners with rounded radius
// This traces a real Chanel/Dior-style rectangular bottle
const CLASSIC_OUTER =
  `M 72,90
   C 72,78 78,72 100,72 C 122,72 128,78 128,90
   L 128,96
   C 148,100 154,112 154,128
   L 154,310
   C 154,332 140,340 100,340
   C 60,340 46,332 46,310
   L 46,128
   C 46,112 52,100 72,96
   Z`

// INNER clip — glass is ~5px thick on sides, ~8px at base
// This is where the liquid lives
const CLASSIC_INNER =
  `M 78,96
   C 78,86 84,82 100,82 C 116,82 122,86 122,96
   L 122,100
   C 140,104 146,116 146,130
   L 146,308
   C 146,326 134,334 100,334
   C 66,334 54,326 54,308
   L 54,130
   C 54,116 60,104 78,100
   Z`

// DESIGNER — faceted like Creed/Tom Ford bottles (octagonal)
const DESIGNER_OUTER =
  `M 80,90
   L 120,90
   C 138,90 148,100 148,118
   L 148,300
   C 148,322 136,340 100,340
   C 64,340 52,322 52,300
   L 52,118
   C 52,100 62,90 80,90
   Z`

const DESIGNER_INNER =
  `M 84,98
   L 116,98
   C 132,98 140,108 140,122
   L 140,298
   C 140,318 130,332 100,332
   C 70,332 60,318 60,298
   L 60,122
   C 60,108 68,98 84,98
   Z`

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
  const outerPath   = isDesigner ? DESIGNER_OUTER : CLASSIC_OUTER
  const innerPath   = isDesigner ? DESIGNER_INNER : CLASSIC_INNER
  const conc        = CONCENTRATION_OPTIONS.find(o => o.value === bottle.concentration)?.label ?? ''
  const displayName = name.length > 13 ? name.slice(0, 12) + '…' : name
  const liqY        = liquidTopY(noteCount)
  const pressurized = bottle.atomizerType === 'pressurized'

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
        {/* This is the key realism element: a very bright narrow strip on left edge */}
        <linearGradient id={`g-spec-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.88"/>
          <stop offset="8%"   stopColor="#ffffff" stopOpacity="0.55"/>
          <stop offset="20%"  stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* Secondary caustic — soft right highlight */}
        <linearGradient id={`g-caus-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="72%"  stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="88%"  stopColor="#ffffff" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.42"/>
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
          <stop offset="60%"  stopColor="#ffffff" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.38"/>
        </linearGradient>

        {/* Centre narrow vertical shimmer */}
        <linearGradient id={`g-shin-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.38"/>
          <stop offset="35%"  stopColor="#ffffff" stopOpacity="0.10"/>
          <stop offset="70%"  stopColor="#ffffff" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.14"/>
        </linearGradient>

        {/* ════ CAP GRADIENTS ════ */}

        {/* Metallic copper cap — brushed horizontal banding */}
        <linearGradient id={`cap-${uid}`} x1="0" y1="0" x2="1" y2="0">
          {metal ? (
            <>
              <stop offset="0%"   stopColor="#4A2808"/>
              <stop offset="18%"  stopColor="#8A5020"/>
              <stop offset="38%"  stopColor="#D4946A"/>
              <stop offset="50%"  stopColor="#F0B880"/>
              <stop offset="62%"  stopColor="#C87840"/>
              <stop offset="82%"  stopColor="#7A4418"/>
              <stop offset="100%" stopColor="#4A2808"/>
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

        {/* Collar/neck gradient */}
        <linearGradient id={`collar-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#8A6040" stopOpacity="0.90"/>
          <stop offset="30%"  stopColor="#C8A070" stopOpacity="0.95"/>
          <stop offset="55%"  stopColor="#E4C090" stopOpacity="1.00"/>
          <stop offset="80%"  stopColor="#B08850" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="#7A5030" stopOpacity="0.90"/>
        </linearGradient>

        {/* ════ CLIP PATHS ════ */}
        <clipPath id={`clip-inner-${uid}`}>
          <path d={innerPath}/>
        </clipPath>
        <clipPath id={`clip-outer-${uid}`}>
          <path d={outerPath}/>
        </clipPath>
        <clipPath id={`clip-cap-${uid}`}>
          <rect x={CAP_X} y={CAP_Y} width={CAP_W} height={CAP_H} rx={CAP_R}/>
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

      </defs>

      {/* ── Ambient colored glow under bottle (matches liquid) ────────────── */}
      <ellipse
        cx="100" cy="396"
        rx="60" ry="12"
        fill={liquid}
        opacity="0.22"
        style={{ transition: 'fill 800ms ease, opacity 600ms ease' }}
      />
      {/* Cast shadow ellipse */}
      <ellipse
        cx="104" cy="392"
        rx="52" ry="8"
        fill="#1A0A04"
        opacity="0.30"
      />

      {/* ── Collar / neck ring ─────────────────────────────────────────────── */}
      {/* Sits between cap and bottle body */}
      <rect
        x="76" y={COLLAR_Y - 2}
        width="48" height={COLLAR_H + 2}
        rx="3"
        fill={`url(#collar-${uid})`}
      />
      {/* Collar highlight line */}
      <line
        x1="80" y1={COLLAR_Y + 1}
        x2="120" y2={COLLAR_Y + 1}
        stroke="#ffffff"
        strokeWidth="1"
        strokeOpacity="0.35"
        strokeLinecap="round"
      />
      {/* Collar base separator */}
      <line
        x1="76" y1={COLLAR_Y + COLLAR_H}
        x2="124" y2={COLLAR_Y + COLLAR_H}
        stroke="#00000040"
        strokeWidth="1.5"
      />

      {/* Pressurized pump ring */}
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

      {/* ── BOTTLE BODY ───────────────────────────────────────────────────── */}
      <g filter={`url(#shadow-${uid})`}>

        {/* === LAYER 1: Glass outer shell — faint cool tint === */}
        {/* Makes glass visible against light backgrounds */}
        <path
          d={outerPath}
          fill="#D8EAF2"
          fillOpacity="0.12"
          stroke="none"
        />

        {/* === LAYER 2: LIQUID — clipped to inner glass wall === */}
        <g clipPath={`url(#clip-inner-${uid})`}>

          {/* Liquid vertical gradient fill */}
          <rect
            x="0" y={liqY}
            width="200" height="420"
            fill={`url(#liq-v-${uid})`}
            style={{
              transition: 'y 750ms cubic-bezier(0.25,0.46,0.45,0.94), fill 650ms ease',
            }}
          />

          {/* Liquid horizontal shading (edge darkening + centre glow) */}
          <rect
            x="0" y={liqY}
            width="200" height="420"
            fill={`url(#liq-h-${uid})`}
            style={{ transition: 'y 750ms cubic-bezier(0.25,0.46,0.45,0.94)' }}
          />

          {/* Meniscus — bright curved surface at liquid top */}
          <ellipse
            cx="100"
            cy={liqY + 3}
            rx="38" ry="5"
            fill={`url(#liq-top-${uid})`}
            style={{ transition: 'cy 750ms cubic-bezier(0.25,0.46,0.45,0.94)' }}
          />

          {/* Caustic light spot inside liquid — realistic refraction pattern */}
          <ellipse
            cx="72" cy="240"
            rx="6" ry="22"
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

        </g>

        {/* === LAYER 3: Glass body tint overlay === */}
        {/* Sits above liquid — gives glass its slightly cool cast */}
        <path
          d={outerPath}
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
          x="140" y="110"
          width="14" height="200"
          rx="5"
          fill={`url(#g-caus-${uid})`}
          clipPath={`url(#clip-outer-${uid})`}
        />

        {/* === LAYER 6: Shoulder highlight — bright top arc === */}
        <rect
          x="48" y="86"
          width="104" height="38"
          rx="12"
          fill={`url(#g-shldr-${uid})`}
          clipPath={`url(#clip-outer-${uid})`}
        />

        {/* === LAYER 7: Base thick-glass brightness === */}
        {/* Real glass is thicker at the base — bright bottom rim */}
        <rect
          x="48" y="316"
          width="104" height="26"
          rx="4"
          fill={`url(#g-base-${uid})`}
          clipPath={`url(#clip-outer-${uid})`}
        />

        {/* === LAYER 8: Central vertical shimmer stripe === */}
        {/* The "camera artifact" — narrow bright column through glass centre */}
        <rect
          x="94" y="100"
          width="8" height="220"
          rx="3"
          fill={`url(#g-shin-${uid})`}
          clipPath={`url(#clip-outer-${uid})`}
        />

        {/* === LAYER 9: Glass edge stroke ===
            Crisp outline — makes the glass silhouette pop */}
        <path
          d={outerPath}
          fill="none"
          stroke="#B8CED8"
          strokeWidth="1.2"
          strokeOpacity="0.55"
        />
        {/* Inner glass wall edge stroke — shows wall thickness */}
        <path
          d={innerPath}
          fill="none"
          stroke="#D0E4EE"
          strokeWidth="0.6"
          strokeOpacity="0.25"
        />

        {/* ═══ LABEL ══════════════════════════════════════════════════════ */}
        {/* Positioned 58% down the bottle body */}
        <rect x="56" y="208" width="88" height="76" rx="2" fill={label.bg}/>
        <rect x="56" y="208" width="88" height="76" rx="2" fill={label.bg2} fillOpacity="0.35"/>
        {/* Top rule */}
        <line x1="64" y1="220" x2="136" y2="220" stroke={label.rule} strokeWidth="0.8"/>
        {/* Brand name */}
        <text
          x="100" y="243"
          textAnchor="middle"
          fill={label.text}
          style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 13.5, fontWeight: 600 }}
        >
          {displayName}
        </text>
        {/* Concentration */}
        <text
          x="100" y="256"
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

      </g>
    </svg>
  )
}
