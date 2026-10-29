'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Search, Sparkles, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PresetCard } from '@/components/preset-card'
import { AddPresetButton } from '@/components/add-preset-button'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { FAMILY_LABELS, PRESETS } from '@/lib/fragrance-data'
import { calculatePrice, formatPrice } from '@/lib/pricing'
import type { FragrancePreset } from '@/lib/types'

function DesignerInspiredCard({ preset }: { preset: FragrancePreset }) {
  const price = calculatePrice(preset.noteIds, preset.bottle).unitTotal

  return (
    <article className="group relative overflow-hidden rounded-3xl border-2 border-[#CCDFF0] bg-gradient-to-br from-[#FDFEFF] via-[#F5F9FD] to-[#E4EEF8] shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
      {/* Luxury Badge */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1E63C8] to-[#57B8F2] px-3 py-1.5 shadow-lg">
        <Sparkles className="size-3 text-[#F5F9FD]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#F5F9FD]">
          Designer
        </span>
      </div>

      <SpotlightCard className="relative z-10 rounded-3xl" spotlightColor="rgba(87, 184, 242, 0.16)">
      {/* Image Section */}
      <Link
        href={`/blend/${preset.id}`}
        className="relative block aspect-[3/4] overflow-hidden"
      >
        <Image
          src={preset.image}
          alt={preset.name}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#051334]/60 via-transparent to-transparent" />
      </Link>

      {/* Content */}
      <div className="space-y-4 p-6">
        {/* Inspired By Label */}
        {preset.inspiredBy && (
          <div className="flex items-center gap-2">
            <Star className="size-4 text-[#57B8F2]" fill="#57B8F2" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E63C8]">
              {preset.inspiredBy}
            </p>
          </div>
        )}

        {/* Title & Price */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-2xl font-bold leading-tight text-[#0A1A52]">
              <Link
                href={`/blend/${preset.id}`}
                className="hover:text-[#1E63C8] transition-colors"
              >
                {preset.name}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-[#5C728F]">{preset.tagline}</p>
          </div>
          <div className="shrink-0 rounded-full bg-gradient-to-br from-[#1E63C8] to-[#57B8F2] px-4 py-2 shadow-md">
            <p className="font-serif text-lg font-bold text-[#F5F9FD]">
              {formatPrice(price)}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="line-clamp-2 text-sm leading-relaxed text-[#0E1B33]/80">
          {preset.description}
        </p>

        {/* Family Pills */}
        <div className="flex flex-wrap gap-2">
          {preset.families.map(family => (
            <span
              key={family}
              className="rounded-full border border-[#CCDFF0] bg-[#FDFEFF]/80 px-3 py-1 text-xs font-medium text-[#0E1B33]"
            >
              {FAMILY_LABELS[family]}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Link
            href={`/builder?preset=${preset.id}`}
            className="flex-1 rounded-full bg-[#1E63C8] px-4 py-3 text-center text-sm font-bold text-[#F5F9FD] btn-shine transition-all hover:bg-[#154FB8] hover:shadow-lg"
          >
            Create Your Version
          </Link>
          {/* Add the curated blend to the cart as-is */}
          <AddPresetButton preset={preset} />
          <Link
            href={`/blend/${preset.id}`}
            className="rounded-full border-2 border-[#CCDFF0] bg-white px-4 py-3 text-sm font-medium text-[#0E1B33] transition-all hover:border-[#1E63C8] hover:bg-[#F5F9FD]"
          >
            Details
          </Link>
        </div>
      </div>
      </SpotlightCard>
    </article>
  )
}

export default function ExplorePage() {
  const [query, setQuery] = useState('')

  const { popularFiltered, inspiredFiltered } = useMemo(() => {
    const lowerQuery = query.toLowerCase()
    const matchesQuery = (preset: FragrancePreset) => {
      const searchText = [
        preset.name,
        preset.tagline,
        preset.description,
        preset.inspiredBy || '',
        preset.families.join(' '),
        preset.occasions.join(' '),
      ]
        .join(' ')
        .toLowerCase()
      return searchText.includes(lowerQuery)
    }

    const popular = PRESETS.filter(
      p => (p.popular || p.featured) && !p.inspiredBy,
    )
    const inspired = PRESETS.filter(p => p.inspiredBy)

    return {
      popularFiltered: popular.filter(matchesQuery),
      inspiredFiltered: inspired.filter(matchesQuery),
    }
  }, [query])

  const allEmpty = popularFiltered.length === 0 && inspiredFiltered.length === 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F9FD] to-[#E4EEF8]">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-[#CCDFF0]/60 bg-gradient-to-br from-[#E8F1FB] via-[#F5F9FD] to-[#D2E5F8] py-14 text-center text-[#0E1B33] sm:py-20">
        <div className="absolute inset-0 opacity-30" aria-hidden="true" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgzMCw5OSwyMDAsMC4wOCkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')" }} />

        <div className="relative mx-auto max-w-4xl px-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#1E63C8]/20 bg-white/60 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="size-4 text-[#1E63C8]" />
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-[#1E63C8]">
              ScentBuild Collection
            </span>
          </div>

          <h1 className="mb-4 font-serif text-4xl font-bold leading-tight text-[#0A1A52] sm:text-5xl md:text-6xl md:leading-tight lg:text-7xl">
            Discover Your
            <span className="block bg-gradient-to-r from-[#1E63C8] to-[#57B8F2] bg-clip-text text-transparent">
              Signature Scent
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-[#5C728F]">
            Explore our curated collection of popular blends and
            designer-inspired fragrances. Every composition can be customized to
            match your unique style.
          </p>

          {/* Search Bar */}
          <div className="relative mx-auto max-w-xl">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#5C728F]" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search by name, mood, or designer inspiration..."
              className="w-full rounded-full border-2 border-[#CCDFF0] bg-white py-4 pl-14 pr-6 text-base text-[#0E1B33] shadow-xl outline-none transition focus:border-[#1E63C8] focus:ring-4 focus:ring-[#1E63C8]/20"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {allEmpty ? (
          <div className="rounded-3xl border-2 border-dashed border-[#CCDFF0] bg-white p-16 text-center">
            <p className="text-lg text-[#5C728F]">
              No matches found. Try a different search term.
            </p>
          </div>
        ) : (
          <div className="space-y-20">
            {/* Section A: Popular Blends */}
            {popularFiltered.length > 0 && (
              <section>
                <div className="mb-8 text-center">
                  <h2 className="font-serif text-4xl font-bold text-[#0A1A52] md:text-5xl">
                    Popular Blends
                  </h2>
                  <p className="mt-3 text-lg text-[#5C728F]">
                    Our most-loved compositions, ready to customize
                  </p>
                </div>
                <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
                  {popularFiltered.map(preset => (
                    <PresetCard key={preset.id} preset={preset} />
                  ))}
                </div>
              </section>
            )}

            {/* Section B: Designer Inspired */}
            {inspiredFiltered.length > 0 && (
              <section>
                <div className="mb-8 text-center">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#57B8F2]/30 bg-gradient-to-r from-[#1E63C8]/10 to-[#57B8F2]/10 px-5 py-2">
                    <Star className="size-5 text-[#57B8F2]" fill="#57B8F2" />
                    <span className="text-sm font-bold uppercase tracking-[0.25em] text-[#1E63C8]">
                      Luxury Collection
                    </span>
                  </div>
                  <h2 className="font-serif text-4xl font-bold text-[#0A1A52] md:text-5xl">
                    Iconic Fragrances,{' '}
                    <span className="bg-gradient-to-r from-[#1E63C8] to-[#57B8F2] bg-clip-text text-transparent">
                      Reimagined
                    </span>
                  </h2>
                  <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-[#5C728F]">
                    Our studio interpretations of legendary designer fragrances
                    — refined note-by-note, elevated with premium materials, and
                    made completely yours to customize.
                  </p>
                </div>
                <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                  {inspiredFiltered.map(preset => (
                    <DesignerInspiredCard key={preset.id} preset={preset} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
