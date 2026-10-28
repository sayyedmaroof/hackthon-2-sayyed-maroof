'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PresetCard } from '@/components/preset-card'
import { PRESETS } from '@/lib/fragrance-data'

export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () =>
      PRESETS.filter(
        (preset) =>
          preset.name.toLowerCase().includes(query.toLowerCase()) ||
          preset.tagline.toLowerCase().includes(query.toLowerCase()) ||
          preset.description.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-ember">Explore</p>
          <h1 className="mt-3 font-serif text-5xl leading-none text-espresso">Browse the ScentBuild library.</h1>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by mood, blend name, family..."
            className="w-full rounded-full border border-border bg-white py-3 pl-9 pr-3 text-sm outline-none transition focus:border-ember"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          No matches yet. Try a different search phrase.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((preset) => (
            <PresetCard key={preset.id} preset={preset} />
          ))}
        </div>
      )}
    </div>
  )
}
