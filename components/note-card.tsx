'use client'

/**
 * NoteCard — image-based fragrance note card for the builder.
 * Shows note image, name, family, price, description, and
 * selection / incompatibility state with smooth Framer Motion feedback.
 */

import { motion } from 'framer-motion'
import { Check, Plus, X } from 'lucide-react'
import Image from 'next/image'
import { FAMILY_LABELS } from '@/lib/fragrance-data'
import type { FragranceNote } from '@/lib/types'
import { cn } from '@/lib/utils'

// ─── Family accent colors ──────────────────────────────────────────────────

export const FAMILY_ACCENT: Record<string, { bg: string; text: string; border: string }> = {
  citrus:   { bg: '#FDF3D8', text: '#7A5C10', border: '#E8C766' },
  fresh:    { bg: '#E8F4F6', text: '#2A6070', border: '#8BBFC8' },
  floral:   { bg: '#FAE8EE', text: '#7A2A40', border: '#D58A92' },
  woody:    { bg: '#F3EBE2', text: '#5C3A1E', border: '#B08060' },
  amber:    { bg: '#FDF0DE', text: '#7A4A10', border: '#C88040' },
  spicy:    { bg: '#FAE8E0', text: '#6A2A10', border: '#C07050' },
  gourmand: { bg: '#FDF4E8', text: '#6A4010', border: '#D4A050' },
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: FragranceNote
  isSelected: boolean
  isCompatible: boolean   // false = clash/incompatible with current blend
  conflictReason?: string
  onToggle: () => void
}

// ─── Component ─────────────────────────────────────────────────────────────

export function NoteCard({
  note,
  isSelected,
  isCompatible,
  conflictReason,
  onToggle,
}: NoteCardProps) {
  const accent = FAMILY_ACCENT[note.family] ?? FAMILY_ACCENT.woody

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={isCompatible || isSelected ? { y: -2, transition: { duration: 0.18 } } : {}}
      whileTap={{ scale: 0.97 }}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Remove' : 'Add'} ${note.name}`}
      title={!isCompatible && !isSelected ? conflictReason : undefined}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200',
        isSelected
          ? 'border-[#B88A3B] bg-[#FAF7F0] shadow-[0_0_0_2px_#B88A3B30,0_4px_16px_rgba(184,138,59,0.14)]'
          : !isCompatible
            ? 'cursor-not-allowed border-[#E5D8C4] bg-[#FBF5EE] opacity-55'
            : 'border-[#E5D8C4] bg-[#FFFEFC] hover:border-[#B88A3B]/40 hover:shadow-[0_4px_16px_rgba(48,36,31,0.10)]',
      )}
    >
      {/* ── Image zone ──────────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F1E8D9]">
        <Image
          src={note.image}
          alt={note.name}
          fill
          sizes="(min-width: 768px) 25vw, 50vw"
          className={cn(
            'object-cover transition-transform duration-500',
            isSelected ? 'scale-105' : 'scale-100 group-hover:scale-[1.03]',
          )}
        />

        {/* Gradient overlay — darkens bottom so text reads cleanly */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#30241F]/30 via-transparent to-transparent"
        />

        {/* Color dot representing this note's blend color */}
        <div
          className="absolute left-2 top-2 size-4 rounded-full border-2 border-white/80 shadow-sm"
          style={{ backgroundColor: note.color }}
          aria-hidden="true"
        />

        {/* Family badge */}
        <div
          className="absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[0.55rem] font-medium uppercase tracking-[0.2em]"
          style={{ backgroundColor: accent.bg, color: accent.text, borderColor: accent.border }}
        >
          {FAMILY_LABELS[note.family as keyof typeof FAMILY_LABELS] ?? note.family}
        </div>

        {/* Selected checkmark overlay */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-[#B88A3B]/12"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-[#B88A3B] shadow-lg">
              <Check className="size-4 text-[#FAF7F0]" aria-hidden="true" />
            </div>
          </motion.div>
        )}

        {/* Incompatible indicator */}
        {!isCompatible && !isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#30241F]/15">
            <span className="rounded-full bg-[#30241F]/70 px-2 py-0.5 text-[0.55rem] font-medium uppercase tracking-[0.2em] text-[#FAF7F0]">
              Clashes
            </span>
          </div>
        )}
      </div>

      {/* ── Info zone ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
        <div className="flex items-start justify-between gap-1">
          <p className={cn(
            'text-sm font-medium leading-tight',
            isSelected ? 'text-[#351329]' : 'text-[#30241F]',
          )}>
            {note.name}
          </p>
          <span className={cn(
            'shrink-0 rounded-full px-1.5 py-0.5 text-[0.6rem] font-medium tabular-nums',
            isSelected
              ? 'bg-[#B88A3B]/15 text-[#B88A3B]'
              : 'bg-[#F1E8D9] text-[#8B7B72]',
          )}>
            ${note.price}
          </span>
        </div>

        <p className="line-clamp-2 text-[0.68rem] leading-relaxed text-[#8B7B72]">
          {note.description}
        </p>

        {/* CTA row */}
        <div className={cn(
          'mt-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.65rem] font-medium transition-colors',
          isSelected
            ? 'bg-[#B88A3B]/10 text-[#B88A3B]'
            : !isCompatible
              ? 'text-[#8B7B72]'
              : 'text-[#8B7B72] group-hover:text-[#30241F]',
        )}>
          {isSelected ? (
            <>
              <X className="size-3" aria-hidden="true" />
              Remove
            </>
          ) : !isCompatible ? (
            <>
              <X className="size-3" aria-hidden="true" />
              Incompatible
            </>
          ) : (
            <>
              <Plus className="size-3" aria-hidden="true" />
              Add to blend
            </>
          )}
        </div>
      </div>
    </motion.button>
  )
}
