'use client'

import { useId } from 'react'
import { CONCENTRATION_OPTIONS } from '@/lib/pricing'
import { EMPTY_BLEND_COLOR } from '@/lib/scoring'
import type { BottleOptions } from '@/lib/types'
import { cn } from '@/lib/utils'

const LABEL_COLORS = {
  ivory: { bg: '#F5F0E8', text: '#251A13', rule: '#B66D36' },
  noir: { bg: '#251A13', text: '#F5F0E8', rule: '#C68149' },
  copper: { bg: '#C68149', text: '#251A13', rule: '#251A13' },
}

const SIZE_SCALE = { 30: 0.8, 50: 0.9, 100: 1 }

const CLASSIC_BODY = 'M56 92 H144 Q172 92 172 120 V252 Q172 280 144 280 H56 Q28 280 28 252 V120 Q28 92 56 92 Z'
const DESIGNER_BODY = 'M64 92 L136 92 L174 132 L174 246 L136 284 L64 284 L26 246 L26 132 Z'

interface BottlePreviewProps {
  name: string
  color?: string | null
  bottle: BottleOptions
  className?: string
  empty?: boolean
}

export function BottlePreview({ name, color, bottle, className, empty }: BottlePreviewProps) {
  const uid = useId().replace(/:/g, '')
  const liquid = color ?? EMPTY_BLEND_COLOR
  const label = LABEL_COLORS[bottle.labelStyle]
  const body = bottle.bottleType === 'designer' ? DESIGNER_BODY : CLASSIC_BODY
  const scale = SIZE_SCALE[bottle.size]
  const metal = bottle.atomizerMaterial === 'metal'
  const concentration = CONCENTRATION_OPTIONS.find((o) => o.value === bottle.concentration)?.label ?? ''
  const fillTop = empty ? 250 : 112
  const displayName = name.length > 16 ? `${name.slice(0, 15)}…` : name

  return (
    <svg
      viewBox="0 0 200 300"
      role="img"
      aria-label={`${bottle.bottleType === 'designer' ? 'Designer' : 'Classic'} ${bottle.size} ml bottle labelled ${name}`}
      className={cn('h-auto w-full', className)}
    >
      <defs>
        <linearGradient id={`liquid-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={liquid} stopOpacity="0.75" />
          <stop offset="100%" stopColor={liquid} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`cap-${uid}`} x1="0" y1="0" x2="1" y2="0">
          {metal ? (
            <>
              <stop offset="0%" stopColor="#8A5530" />
              <stop offset="45%" stopColor="#E0A676" />
              <stop offset="100%" stopColor="#7A4726" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#1A120D" />
              <stop offset="50%" stopColor="#3B2A20" />
              <stop offset="100%" stopColor="#1A120D" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.18" />
        </linearGradient>
        <clipPath id={`body-${uid}`}>
          <path d={body} />
        </clipPath>
      </defs>

      <g
        style={{ transform: `scale(${scale})`, transformOrigin: '100px 290px', transition: 'transform 500ms ease' }}
      >
        <ellipse cx="100" cy="290" rx="78" ry="6" fill="#000" opacity="0.18" />

        {/* Cap and atomizer */}
        <rect x="74" y="18" width="52" height="56" rx={bottle.bottleType === 'designer' ? 2 : 8} fill={`url(#cap-${uid})`} />
        <rect x="74" y="24" width="52" height="2" fill="#FFFFFF" opacity={metal ? 0.35 : 0.08} />
        <rect x="88" y="74" width="24" height="18" fill="#D8C3A5" opacity="0.7" />
        {bottle.atomizerType === 'pressurized' && (
          <rect x="82" y="80" width="36" height="8" rx="2" fill={`url(#cap-${uid})`} />
        )}

        {/* Glass body */}
        <path d={body} fill="#FFFCF7" fillOpacity="0.35" stroke="#FFFCF7" strokeOpacity="0.6" strokeWidth="2" />
        <g clipPath={`url(#body-${uid})`}>
          <rect
            x="0"
            y={fillTop}
            width="200"
            height="200"
            fill={`url(#liquid-${uid})`}
            style={{ transition: 'y 600ms ease, fill 600ms ease' }}
          />
          <rect x="0" y="0" width="200" height="300" fill={`url(#glass-${uid})`} />
          <rect x="40" y="100" width="10" height="170" rx="5" fill="#FFFFFF" opacity="0.28" />
        </g>

        {/* Label */}
        <rect x="56" y="164" width="88" height="70" rx="2" fill={label.bg} />
        <line x1="66" y1="176" x2="134" y2="176" stroke={label.rule} strokeWidth="0.75" />
        <text
          x="100"
          y="200"
          textAnchor="middle"
          fill={label.text}
          style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 13, fontWeight: 500 }}
        >
          {displayName}
        </text>
        <text
          x="100"
          y="214"
          textAnchor="middle"
          fill={label.text}
          opacity="0.75"
          style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 5.5, letterSpacing: 1.4 }}
        >
          {concentration.toUpperCase()}
        </text>
        <line x1="66" y1="222" x2="134" y2="222" stroke={label.rule} strokeWidth="0.75" />
        <text
          x="100"
          y="230"
          textAnchor="middle"
          fill={label.text}
          opacity="0.75"
          style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 5.5, letterSpacing: 1.4 }}
        >
          {`${bottle.size} ML · SCENTBUILD`}
        </text>
      </g>
    </svg>
  )
}
