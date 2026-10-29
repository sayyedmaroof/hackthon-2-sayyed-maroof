'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Check,
  ChevronDown,
  Compass,
  Info,
  PencilLine,
  RotateCcw,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { GlassBottle } from '@/components/glass-bottle'
import { NoteCard } from '@/components/note-card'
import { ScentAdvisor } from '@/components/scent-advisor'
import { FamilyMix, ProfileBars } from '@/components/scent-profile'
import { Walkthrough, type WalkthroughStep } from '@/components/walkthrough'
import {
  FAMILIES,
  FAMILY_LABELS,
  LAYER_INFO,
  LAYERS,
  NOTES,
  getPreset,
} from '@/lib/fragrance-data'
import { fadeUp, staggerContainer } from '@/lib/motion'
import {
  calculatePrice,
  BASE_OPTIONS,
  CONCENTRATION_OPTIONS,
  formatPrice,
  LABEL_OPTIONS,
  SIZE_OPTIONS,
} from '@/lib/pricing'
import { EMPTY_BLEND_COLOR, computeProfile } from '@/lib/scoring'
import { useAuth } from '@/lib/auth-store'
import { useStudio } from '@/lib/studio-store'
import type { Family, Layer } from '@/lib/types'
import { cn } from '@/lib/utils'
import { validateAdd, validateBlend } from '@/lib/validation'

// ─── Layer meta ──────────────────────────────────────────────────────────────

const LAYER_ACCENT: Record<
  Layer,
  { color: string; label: string; range: string }
> = {
  top: { color: '#E8C766', label: 'Top Notes', range: '0 – 30 min' },
  middle: { color: '#D58A92', label: 'Heart Notes', range: '30 min – 4 h' },
  base: { color: '#8A5A3A', label: 'Base Notes', range: '4 h +' },
}

// ─── Builder walkthrough ─────────────────────────────────────────────────────

const BUILDER_STEPS: WalkthroughStep[] = [
  {
    title: 'Welcome to the builder',
    body: 'Design a one-of-a-kind fragrance in three layers — top, heart and base — then bottle it exactly how you like. Takes about two minutes.',
  },
  {
    target: 'builder-layers',
    title: 'Compose in layers',
    body: 'Switch between the three fragrant layers. Each tab shows how long its notes last, and a badge counts what you have picked so far.',
  },
  {
    target: 'builder-search',
    title: 'Find your notes',
    body: 'Search by name or mood, and narrow the list down by fragrance family — citrus, woods, florals and more.',
  },
  {
    target: 'builder-bottle',
    title: 'Make it yours',
    body: 'Expand this panel to choose the size, concentration, bottle shape, atomizer and label. Your choices carry into the price.',
  },
  {
    target: 'builder-preview',
    title: 'Watch it come alive',
    body: 'The bottle, liquid colour, blend character and scent-mix charts update live as you compose. The Scent Advisor is on hand if you want suggestions.',
  },
  {
    target: 'builder-price',
    title: 'Transparent pricing',
    body: 'The breakdown updates with every choice. When you are happy, save the blend to your account or head straight to the cart.',
  },
]

// ─── Builder inner (needs Suspense for useSearchParams) ──────────────────────

function BuilderContent() {
  const searchParams = useSearchParams()
  const {
    draft,
    addNote,
    removeNote,
    clearDraft,
    saveDraft,
    addToCart,
    setBottle,
    setName,
    loadBlend,
    editingCartItemId,
    cancelEditCartItem,
  } = useStudio()
  const { requireAuth } = useAuth()

  const [activeLayer, setActiveLayer] = useState<Layer>('top')
  const [query, setQuery] = useState('')
  const [familyFilter, setFamilyFilter] = useState<Family | null>(null)
  const [showBottleOptions, setShowBottleOptions] = useState(false)
  const [tourReplay, setTourReplay] = useState(0)

  // Load preset from URL on mount
  useEffect(() => {
    const presetId = searchParams.get('preset')
    if (!presetId) return
    const preset = getPreset(presetId)
    if (!preset) return
    loadBlend({
      name: preset.name,
      noteIds: preset.noteIds,
      bottle: preset.bottle,
      presetId: preset.id,
    })
    // Pick active layer from what the preset loaded
    const firstLayer = (['top', 'middle', 'base'] as Layer[]).find(l =>
      preset.noteIds.some(id => NOTES.find(n => n.id === id)?.layer === l),
    )
    if (firstLayer) setActiveLayer(firstLayer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const profile = useMemo(() => computeProfile(draft.noteIds), [draft.noteIds])
  const validation = useMemo(
    () => validateBlend(draft.noteIds),
    [draft.noteIds],
  )
  const price = useMemo(
    () => calculatePrice(draft.noteIds, draft.bottle),
    [draft.noteIds, draft.bottle],
  )

  const liquidColor = profile?.color ?? EMPTY_BLEND_COLOR

  // Filter notes for the active layer
  const layerNotes = useMemo(() => {
    return NOTES.filter(n => {
      if (n.layer !== activeLayer) return false
      if (familyFilter && n.family !== familyFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          n.name.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          n.family.includes(q)
        )
      }
      return true
    })
  }, [activeLayer, familyFilter, query])

  // Families available within the active layer
  const availableFamilies = useMemo(() => {
    const set = new Set(
      NOTES.filter(n => n.layer === activeLayer).map(n => n.family),
    )
    return FAMILIES.filter(f => set.has(f))
  }, [activeLayer])

  // Count selected per layer
  const countByLayer = useMemo(() => {
    const counts: Record<Layer, number> = { top: 0, middle: 0, base: 0 }
    for (const id of draft.noteIds) {
      const note = NOTES.find(n => n.id === id)
      if (note) counts[note.layer]++
    }
    return counts
  }, [draft.noteIds])

  const handleToggle = (noteId: string) => {
    if (draft.noteIds.includes(noteId)) {
      removeNote(noteId)
      const note = NOTES.find(n => n.id === noteId)
      if (note) toast(`${note.name} removed.`, { icon: '✕' })
    } else {
      const result = addNote(noteId)
      if (!result.ok) {
        toast.error(result.message, {
          description:
            result.alternatives.length > 0
              ? `Try instead: ${result.alternatives.map(a => a.name).join(', ')}`
              : undefined,
        })
        return
      }
      toast.success(`${result.note.name} added.`)
    }
  }

  const handleAddToCart = () => {
    if (draft.noteIds.length === 0) {
      toast.error('Add at least one note first.')
      return
    }
    // When editing, the store consumes editingCartItemId and updates the item in place.
    const isEditing = !!editingCartItemId
    requireAuth(() => {
      addToCart()
      toast.success(isEditing ? 'Cart item updated.' : 'Blend added to cart.')
    })
  }

  const handleSave = () => {
    if (draft.noteIds.length === 0) {
      toast.error('Add at least one note before saving.')
      return
    }
    requireAuth(() => {
      saveDraft()
      toast.success('Blend saved to your account.')
    })
  }

  const handleClear = () => {
    clearDraft()
    if (editingCartItemId) cancelEditCartItem()
    setQuery('')
    setFamilyFilter(null)
    toast('Blend cleared.', { icon: '↺' })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F9FD]">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="border-b border-[#CCDFF0] bg-[#FDFEFF]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-[#1E63C8]">
              Fragrance builder
            </p>
            <h1 className="mt-1.5 font-serif text-3xl font-medium text-[#0E1B33] sm:text-4xl">
              Create Your Signature Scent
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTourReplay(key => key + 1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#CCDFF0] bg-[#FDFEFF] px-4 py-2 text-sm font-medium text-[#5C728F] transition-colors hover:border-[#1E63C8]/40 hover:text-[#0E1B33]"
            >
              <Compass className="size-3.5" aria-hidden="true" /> Tour
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#CCDFF0] bg-[#FDFEFF] px-4 py-2 text-sm font-medium text-[#5C728F] transition-colors hover:border-[#1E63C8]/40 hover:text-[#0E1B33]"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" /> Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1E63C8]/30 bg-[#FDFEFF] px-4 py-2 text-sm font-medium text-[#1E63C8] transition-colors hover:bg-[#154FB8]/8"
            >
              Save blend
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              className="inline-flex items-center gap-2 rounded-full bg-[#1E63C8] px-5 py-2.5 text-sm font-medium text-[#F5F9FD] transition-colors hover:bg-[#154FB8]"
            >
              <ShoppingBag className="size-4" aria-hidden="true" />
              {editingCartItemId ? 'Update cart' : 'Add to cart'} · {formatPrice(price.unitTotal)}
            </button>
          </div>
        </div>
      </div>

      {/* ── Editing-cart-item banner ─────────────────────────────────────── */}
      {editingCartItemId && (
        <div className="border-b border-[#CCDFF0] bg-[#1E63C8]/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
            <p className="text-sm text-[#1E63C8]">
              <PencilLine className="mr-1.5 inline size-4" aria-hidden="true" />
              You&apos;re editing a cart item — <strong>&ldquo;Update cart&rdquo;</strong> applies your changes in place.
            </p>
            <button
              type="button"
              onClick={() => {
                cancelEditCartItem()
                toast('Editing cancelled — next add creates a new cart item.', { icon: '↺' })
              }}
              className="rounded-full border border-[#1E63C8]/30 bg-[#FDFEFF] px-4 py-1.5 text-xs font-medium text-[#1E63C8] transition-colors hover:bg-white"
            >
              Cancel editing
            </button>
          </div>
        </div>
      )}

      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
          {/* ════════════════════════════════════════════════════════════
              LEFT — note picker panel
          ════════════════════════════════════════════════════════════ */}
          <div className="min-w-0 space-y-6">
            {/* ── Blend name input ───────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <input
                value={draft.name}
                onChange={e => setName(e.target.value)}
                placeholder="Name your blend…"
                maxLength={32}
                className="min-w-0 flex-1 rounded-full border border-[#CCDFF0] bg-[#FDFEFF] px-5 py-3 font-serif text-lg text-[#0E1B33] outline-none transition focus:border-[#1E63C8] focus:ring-2 focus:ring-[#1E63C8]/20"
              />
              <span className="shrink-0 rounded-full border border-[#CCDFF0] bg-[#FDFEFF] px-3 py-2 text-sm font-medium text-[#5C728F]">
                {draft.noteIds.length} note
                {draft.noteIds.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* ── Compatibility warnings ─────────────────────────────── */}
            <AnimatePresence>
              {validation.issues.length > 0 && (
                <motion.div
                  key="warning"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-3 rounded-2xl border border-[#E5C4B0] bg-[#FDF3EE] p-4">
                    <AlertCircle
                      className="mt-0.5 size-5 shrink-0 text-[#B05030]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#7A2A10]">
                        Compatibility note
                      </p>
                      <p className="mt-0.5 text-sm text-[#8A4020]">
                        {validation.issues[0].rule.reason}
                      </p>
                      {validation.issues[0].rule.alternatives && (
                        <p className="mt-1.5 text-xs text-[#8A4020]/80">
                          Consider removing{' '}
                          <strong>{validation.issues[0].noteB.name}</strong> or
                          swapping for a compatible note.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Layer tab navigation ───────────────────────────────── */}
            <div
              data-walkthrough="builder-layers"
              className="rounded-2xl border border-[#CCDFF0] bg-[#FDFEFF] p-1.5"
            >
              <div className="grid grid-cols-3 gap-1">
                {LAYERS.map(layer => {
                  const acc = LAYER_ACCENT[layer]
                  const count = countByLayer[layer]
                  const isActive = activeLayer === layer
                  return (
                    <button
                      key={layer}
                      type="button"
                      onClick={() => setActiveLayer(layer)}
                      className={cn(
                        'relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-3 text-center transition-all duration-200',
                        isActive
                          ? 'bg-[#0E1B33] text-[#F5F9FD] shadow-sm'
                          : 'text-[#5C728F] hover:bg-[#E4EEF8] hover:text-[#0E1B33]',
                      )}
                    >
                      {/* Layer color indicator */}
                      <span
                        className="mb-0.5 inline-block size-2 rounded-full"
                        style={{
                          backgroundColor: isActive
                            ? acc.color
                            : `${acc.color}99`,
                        }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium uppercase tracking-[0.12em]">
                        {acc.label}
                      </span>
                      <span
                        className={cn(
                          'text-[0.6rem] uppercase tracking-[0.15em]',
                          isActive ? 'text-[#F5F9FD]/50' : 'text-[#5C728F]/60',
                        )}
                      >
                        {acc.range}
                      </span>
                      {/* Selected count badge */}
                      {count > 0 && (
                        <span
                          className={cn(
                            'absolute right-2 top-2 flex size-4 items-center justify-center rounded-full text-[0.55rem] font-bold',
                            isActive
                              ? 'bg-[#1E63C8] text-[#F5F9FD]'
                              : 'bg-[#1E63C8]/20 text-[#1E63C8]',
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Layer description ──────────────────────────────────── */}
            <AnimatePresence mode="wait">
              <motion.p
                key={activeLayer}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22 }}
                className="flex items-start gap-2 text-sm text-[#5C728F]"
              >
                <Info
                  className="mt-0.5 size-4 shrink-0 text-[#1E63C8]"
                  aria-hidden="true"
                />
                {LAYER_INFO[activeLayer].description}
              </motion.p>
            </AnimatePresence>

            {/* ── Search + family filter ─────────────────────────────── */}
            <div
              data-walkthrough="builder-search"
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#5C728F]"
                  aria-hidden="true"
                />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search notes…"
                  className="w-full rounded-full border border-[#CCDFF0] bg-[#FDFEFF] py-2.5 pl-10 pr-4 text-sm text-[#0E1B33] outline-none transition focus:border-[#1E63C8] focus:ring-2 focus:ring-[#1E63C8]/15"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5C728F] hover:text-[#0E1B33]"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Family filter pills */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFamilyFilter(null)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    familyFilter === null
                      ? 'border-[#1E63C8] bg-[#1E63C8] text-[#F5F9FD]'
                      : 'border-[#CCDFF0] bg-[#FDFEFF] text-[#5C728F] hover:border-[#1E63C8]/40',
                  )}
                >
                  All
                </button>
                {availableFamilies.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() =>
                      setFamilyFilter(familyFilter === f ? null : f)
                    }
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      familyFilter === f
                        ? 'border-[#1E63C8] bg-[#1E63C8] text-[#F5F9FD]'
                        : 'border-[#CCDFF0] bg-[#FDFEFF] text-[#5C728F] hover:border-[#1E63C8]/40',
                    )}
                  >
                    {FAMILY_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Note cards grid ────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeLayer}-${familyFilter ?? 'all'}`}
                initial="hidden"
                animate="show"
                variants={staggerContainer(0.05, 0)}
                className={cn(
                  'grid gap-3',
                  layerNotes.length === 0
                    ? ''
                    : 'sm:grid-cols-2 xl:grid-cols-3',
                )}
              >
                {layerNotes.length === 0 ? (
                  <motion.p
                    variants={fadeUp}
                    className="col-span-full rounded-2xl border border-dashed border-[#CCDFF0] p-8 text-center text-sm text-[#5C728F]"
                  >
                    No notes match your filter. Try adjusting your search.
                  </motion.p>
                ) : (
                  layerNotes.map(note => {
                    const isSelected = draft.noteIds.includes(note.id)
                    const result = validateAdd(draft.noteIds, note.id)
                    const isCompatible = isSelected || result.ok

                    return (
                      <motion.div key={note.id} variants={fadeUp}>
                        <NoteCard
                          note={note}
                          isSelected={isSelected}
                          isCompatible={isCompatible}
                          conflictReason={
                            !isCompatible && !result.ok
                              ? (result as { message: string }).message
                              : undefined
                          }
                          onToggle={() => handleToggle(note.id)}
                        />
                      </motion.div>
                    )
                  })
                )}
              </motion.div>
            </AnimatePresence>

            {/* ── Bottle options (collapsible) ───────────────────────── */}
            <div
              data-walkthrough="builder-bottle"
              className="rounded-2xl border border-[#CCDFF0] bg-[#FDFEFF]"
            >
              <button
                type="button"
                onClick={() => setShowBottleOptions(v => !v)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#1E63C8]">
                    Bottle options
                  </p>
                  <p className="mt-0.5 text-sm text-[#5C728F]">
                    {draft.bottle.size} ml ·{' '}
                    {
                      CONCENTRATION_OPTIONS.find(
                        o => o.value === draft.bottle.concentration,
                      )?.label
                    }
                    {draft.bottle.base === 'water' ? ' · Alcohol-free' : ''}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'size-4 text-[#5C728F] transition-transform duration-200',
                    showBottleOptions ? 'rotate-180' : '',
                  )}
                  aria-hidden="true"
                />
              </button>

              <AnimatePresence>
                {showBottleOptions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-5 border-t border-[#CCDFF0] px-5 py-5">
                      {/* Size */}
                      <BottleOptionRow
                        label="Size"
                        options={SIZE_OPTIONS.map(o => ({
                          value: String(o.value),
                          label: o.label,
                        }))}
                        value={String(draft.bottle.size)}
                        onChange={v =>
                          setBottle({ size: Number(v) as 30 | 50 | 100 })
                        }
                      />

                      {/* Formulation base */}
                      <BottleOptionRow
                        label="Base"
                        options={BASE_OPTIONS.map(o => ({
                          value: o.value,
                          label: o.label,
                          detail: o.detail,
                        }))}
                        value={draft.bottle.base}
                        onChange={v =>
                          setBottle({ base: v as 'alcohol' | 'water' })
                        }
                      />

                      {/* Concentration */}
                      <BottleOptionRow
                        label="Concentration"
                        options={CONCENTRATION_OPTIONS.map(o => ({
                          value: o.value,
                          label: o.label,
                          detail: o.detail,
                        }))}
                        value={draft.bottle.concentration}
                        onChange={v =>
                          setBottle({
                            concentration: v as 'edt' | 'edp' | 'parfum',
                          })
                        }
                        wide
                      />

                      {/* Bottle type */}
                      <BottleOptionRow
                        label="Bottle shape"
                        options={[
                          { value: 'classic', label: 'Classic' },
                          { value: 'designer', label: 'Designer facet' },
                        ]}
                        value={draft.bottle.bottleType}
                        onChange={v =>
                          setBottle({ bottleType: v as 'classic' | 'designer' })
                        }
                      />

                      {/* Atomizer material */}
                      <BottleOptionRow
                        label="Atomizer"
                        options={[
                          { value: 'plastic', label: 'Matte polymer' },
                          { value: 'metal', label: 'Brushed copper +$8' },
                        ]}
                        value={draft.bottle.atomizerMaterial}
                        onChange={v =>
                          setBottle({
                            atomizerMaterial: v as 'plastic' | 'metal',
                          })
                        }
                      />

                      {/* Label */}
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-[#5C728F]">
                          Label
                        </p>
                        <div className="flex gap-2">
                          {LABEL_OPTIONS.map(o => (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() => setBottle({ labelStyle: o.value })}
                              className={cn(
                                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                draft.bottle.labelStyle === o.value
                                  ? 'border-[#1E63C8] bg-[#1E63C8]/10 text-[#1E63C8]'
                                  : 'border-[#CCDFF0] text-[#5C728F] hover:border-[#1E63C8]/40',
                              )}
                            >
                              <span
                                className="size-3 rounded-full border border-[#CCDFF0]"
                                style={{ backgroundColor: o.swatch }}
                                aria-hidden="true"
                              />
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Scent Advisor (mobile/tablet — desktop renders it in the sticky aside) ── */}
            <div className="lg:hidden">
              <ScentAdvisor
                noteIds={draft.noteIds}
                onAddNote={addNote}
                onRemoveNote={removeNote}
                onReplaceNote={(oldId, newId) => {
                  removeNote(oldId)
                  addNote(newId)
                }}
                onSetConcentration={value =>
                  setBottle({ concentration: value })
                }
              />
            </div>

            {/* ── Price breakdown ────────────────────────────────────── */}
            {draft.noteIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                data-walkthrough="builder-price"
                className="rounded-2xl border border-[#CCDFF0] bg-[#FDFEFF] p-5"
              >
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#1E63C8]">
                  Price breakdown
                </p>
                <dl className="mt-4 space-y-2 text-sm text-[#0E1B33]">
                  {price.lines.map(line => (
                    <div
                      key={line.label}
                      className="flex items-center justify-between gap-3"
                    >
                      <dt className="text-[#5C728F]">{line.label}</dt>
                      <dd className="font-medium tabular-nums">
                        {line.amount === 0 ? (
                          <span className="text-[#5C728F]">Included</span>
                        ) : (
                          formatPrice(line.amount)
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 rounded-xl bg-[#1E63C8] px-5 py-4 text-[#F5F9FD]">
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-[#57B8F2]">
                    Estimated total
                  </p>
                  <p className="mt-1 font-serif text-3xl">
                    {formatPrice(price.unitTotal)}
                  </p>
                </div>

                {/* Add to cart */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="mt-4 w-full rounded-full bg-[#1E63C8] px-6 py-3.5 text-sm font-medium text-[#F5F9FD] transition-colors hover:bg-[#57B8F2]"
                >
                  {editingCartItemId ? 'Update cart' : 'Add to cart'}
                </button>
              </motion.div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════
              RIGHT — sticky bottle preview column
          ════════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:block">
            <div
              className="sticky top-[88px] space-y-5"
              style={{ maxHeight: 'calc(100svh - 108px)', overflowY: 'auto' }}
            >
              {/* Bottle */}
              <div
                data-walkthrough="builder-preview"
                className="rounded-[2rem] border border-[#CCDFF0] bg-[#FDFEFF] p-6"
              >
                {/* Bottle visual */}
                <div className="relative mx-auto flex max-w-[240px] items-center justify-center">
                  {/* Ambient glow behind bottle */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full blur-[48px]"
                    style={{
                      backgroundColor: liquidColor,
                      opacity: 0.18,
                      transition: 'background-color 700ms ease',
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full"
                  >
                    <GlassBottle
                      name={draft.name}
                      color={liquidColor}
                      bottle={draft.bottle}
                      noteCount={draft.noteIds.length}
                      className="drop-shadow-[0_20px_40px_rgba(0,0,0,0.22)]"
                    />
                  </motion.div>
                </div>

                {/* Blend name + character */}
                <div className="mt-4 text-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${profile?.character ?? 'none'}-${profile?.family ?? 'none'}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.3 }}
                    >
                      {profile ? (
                        <>
                          <p className="font-serif text-2xl text-[#0E1B33] capitalize">
                            {profile.character}
                          </p>
                          <p className="mt-0.5 text-xs uppercase tracking-[0.25em] text-[#1E63C8]">
                            {profile.family}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-[#5C728F]">
                          Add notes to build your blend
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Liquid color swatch row */}
                {draft.noteIds.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#E4EEF8] px-3 py-2">
                    <div
                      className="size-4 flex-shrink-0 rounded-full border border-[#CCDFF0] shadow-sm"
                      style={{
                        backgroundColor: liquidColor,
                        transition: 'background-color 700ms ease',
                      }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="h-2 overflow-hidden rounded-full"
                        style={{ backgroundColor: `${liquidColor}40` }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: liquidColor }}
                          animate={{
                            width: `${Math.min(100, (draft.noteIds.length / 6) * 100)}%`,
                          }}
                          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                        />
                      </div>
                    </div>
                    <span className="text-[0.6rem] text-[#5C728F]">
                      {draft.noteIds.length}/6
                    </span>
                  </div>
                )}
              </div>

              {/* Selected notes list */}
              <div className="rounded-2xl border border-[#CCDFF0] bg-[#FDFEFF] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#1E63C8]">
                  Your blend
                </p>

                {draft.noteIds.length === 0 ? (
                  <p className="mt-3 text-sm text-[#5C728F]">
                    No notes selected. Choose from the left panel.
                  </p>
                ) : (
                  <div className="mt-3 space-y-1">
                    {(['top', 'middle', 'base'] as Layer[]).map(layer => {
                      const layerSelected = draft.noteIds
                        .map(id => NOTES.find(n => n.id === id))
                        .filter(n => n?.layer === layer)
                      if (layerSelected.length === 0) return null
                      return (
                        <div key={layer}>
                          <p
                            className="mb-1 mt-2 text-[0.6rem] font-medium uppercase tracking-[0.25em]"
                            style={{ color: LAYER_ACCENT[layer].color }}
                          >
                            {LAYER_ACCENT[layer].label}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {layerSelected.map(
                              note =>
                                note && (
                                  <button
                                    key={note.id}
                                    type="button"
                                    onClick={() => handleToggle(note.id)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#CCDFF0] bg-[#E4EEF8] px-2.5 py-1 text-xs text-[#0E1B33] transition-colors hover:border-[#1E63C8]/40 hover:bg-[#154FB8]/8"
                                  >
                                    <span
                                      className="size-2 rounded-full"
                                      style={{ backgroundColor: note.color }}
                                      aria-hidden="true"
                                    />
                                    {note.name}
                                    <X
                                      className="size-2.5 text-[#5C728F]"
                                      aria-hidden="true"
                                    />
                                  </button>
                                ),
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Scent profile */}
              {profile && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-[#CCDFF0] bg-[#FDFEFF] p-5"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#1E63C8]">
                    Scent profile
                  </p>
                  <div className="mt-4 rounded-xl bg-[#E4EEF8] p-3">
                    <FamilyMix profile={profile} />
                  </div>
                  <div className="mt-4">
                    <ProfileBars profile={profile} compact />
                  </div>
                </motion.div>
              )}

              {/* Missing layers hint */}
              {validation.missingLayers.length > 0 &&
                draft.noteIds.length > 0 && (
                  <div className="rounded-2xl border border-[#CCDFF0] bg-[#FDFEFF] p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#1E63C8]">
                      Complete your blend
                    </p>
                    <div className="mt-3 space-y-2">
                      {(['top', 'middle', 'base'] as Layer[]).map(layer => {
                        const count = countByLayer[layer]
                        const missing = validation.missingLayers.includes(layer)
                        return (
                          <button
                            key={layer}
                            type="button"
                            onClick={() => setActiveLayer(layer)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                              missing
                                ? 'border-[#CCDFF0] text-[#5C728F] hover:border-[#1E63C8]/40 hover:bg-[#E4EEF8]'
                                : 'border-transparent bg-[#1E63C8]/8 text-[#0E1B33]',
                            )}
                          >
                            <span
                              className={cn(
                                'flex size-5 items-center justify-center rounded-full text-[0.6rem]',
                                missing
                                  ? 'bg-[#CCDFF0] text-[#5C728F]'
                                  : 'bg-[#1E63C8] text-[#F5F9FD]',
                              )}
                            >
                              {missing ? (
                                '?'
                              ) : (
                                <Check className="size-3" aria-hidden="true" />
                              )}
                            </span>
                            <span className="flex-1 text-left">
                              {LAYER_ACCENT[layer].label}
                            </span>
                            <span className="text-xs text-[#5C728F]">
                              {count > 0 ? `${count} selected` : 'Add a note'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

              {/* Scent Advisor */}
              <ScentAdvisor
                noteIds={draft.noteIds}
                onAddNote={addNote}
                onRemoveNote={removeNote}
                onReplaceNote={(oldId, newId) => {
                  removeNote(oldId)
                  addNote(newId)
                }}
                onSetConcentration={value =>
                  setBottle({ concentration: value })
                }
              />
            </div>
          </aside>

          {/* ════════════════════════════════════════════════════════════
              MOBILE — compact preview strip (shown below header)
              Visible only on <lg screens, positioned above note picker
          ════════════════════════════════════════════════════════════ */}
        </div>
      </div>

      {/* ── Mobile sticky bottle bar ──────────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 border-t border-[#CCDFF0] bg-[#F5F9FD]/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6">
          {/* Mini bottle */}
          <div className="relative flex-shrink-0">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full blur-[14px]"
              style={{
                backgroundColor: liquidColor,
                opacity: 0.25,
                transition: 'background-color 700ms ease',
              }}
            />
            <div className="relative w-12">
              <GlassBottle
                name={draft.name}
                color={liquidColor}
                bottle={draft.bottle}
                noteCount={draft.noteIds.length}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {profile ? (
              <>
                <p className="truncate text-sm font-medium text-[#0E1B33]">
                  {draft.name || 'Untitled Blend'}
                </p>
                <p className="text-xs text-[#5C728F] capitalize">
                  {profile.character} · {profile.family}
                </p>
              </>
            ) : (
              <p className="text-sm text-[#5C728F]">No notes selected yet</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#1E63C8]">
              {formatPrice(price.unitTotal)}
            </span>
            <button
              type="button"
              onClick={handleAddToCart}
              className="rounded-full bg-[#1E63C8] px-4 py-2 text-xs font-medium text-[#F5F9FD] transition-colors hover:bg-[#154FB8]"
            >
              {editingCartItemId ? 'Update cart' : 'Add to cart'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Guided walkthrough ───────────────────────────────────────────── */}
      <Walkthrough
        steps={BUILDER_STEPS}
        storageKey="scentbuild:walkthrough:builder:v1"
        replayKey={tourReplay}
      />
    </div>
  )
}

// ─── Bottle option row helper ─────────────────────────────────────────────────

function BottleOptionRow({
  label,
  options,
  value,
  onChange,
  wide = false,
}: {
  label: string
  options: { value: string; label: string; detail?: string }[]
  value: string
  onChange: (v: string) => void
  wide?: boolean
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-[#5C728F]">
        {label}
      </p>
      <div className={cn('flex flex-wrap gap-2', wide ? 'flex-col' : '')}>
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-col rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors',
              value === o.value
                ? 'border-[#1E63C8] bg-[#1E63C8]/10 text-[#1E63C8]'
                : 'border-[#CCDFF0] text-[#5C728F] hover:border-[#1E63C8]/40 hover:text-[#0E1B33]',
            )}
          >
            {o.label}
            {o.detail && (
              <span className="mt-0.5 font-normal text-[#5C728F]/70">
                {o.detail}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F9FD]">
          <p className="text-sm text-[#5C728F]">Loading builder…</p>
        </div>
      }
    >
      <BuilderContent />
    </Suspense>
  )
}
