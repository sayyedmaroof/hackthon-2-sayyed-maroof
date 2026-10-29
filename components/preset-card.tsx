import Image from 'next/image'
import Link from 'next/link'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { AddPresetButton } from '@/components/add-preset-button'
import { FAMILY_LABELS } from '@/lib/fragrance-data'
import { calculatePrice, formatPrice } from '@/lib/pricing'
import type { FragrancePreset } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PresetCard({
  preset,
  dark,
  priority,
}: {
  preset: FragrancePreset
  dark?: boolean
  priority?: boolean
}) {
  const price = calculatePrice(preset.noteIds, preset.bottle).unitTotal

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        dark
          ? 'border-[#F5F9FD]/8 bg-[#0B1B44] text-[#F5F9FD]'
          : 'border-[#CCDFF0] bg-[#FDFEFF] text-[#0E1B33]',
      )}
    >
      <SpotlightCard className="relative z-10 flex flex-1 flex-col rounded-2xl" spotlightColor="rgba(87, 184, 242, 0.14)">
      {/* Image */}
      <Link href={`/blend/${preset.id}`} className="relative block aspect-[4/5] overflow-hidden">
        <Image
          src={preset.image}
          alt={`${preset.name} fragrance bottle styled with its key ingredients`}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Bottom gradient */}
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-0 bg-gradient-to-t to-transparent',
            dark ? 'from-[#0B1B44]/70' : 'from-[#051334]/40',
          )}
        />
        {preset.popular && (
          <span className="absolute left-3 top-3 rounded-full bg-[#1E63C8]/90 px-2.5 py-1 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-[#F5F9FD]">
            Popular
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-2xl leading-tight">
              <Link href={`/blend/${preset.id}`} className="hover:underline underline-offset-2">
                {preset.name}
              </Link>
            </h3>
            <p className={cn('mt-0.5 text-sm', dark ? 'text-[#F5F9FD]/60' : 'text-[#5C728F]')}>
              {preset.tagline}
            </p>
          </div>
          <p className="shrink-0 font-serif text-lg text-[#1E63C8]">{formatPrice(price)}</p>
        </div>

        {/* Family pills */}
        <ul className="flex flex-wrap gap-1.5" aria-label="Fragrance families">
          {preset.families.map((family) => (
            <li
              key={family}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs',
                dark
                  ? 'border-[#F5F9FD]/12 text-[#F5F9FD]/55'
                  : 'border-[#CCDFF0] text-[#5C728F]',
              )}
            >
              {FAMILY_LABELS[family]}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-2">
          <Link
            href={`/builder?preset=${preset.id}`}
            className={cn(
              'flex-1 rounded-full px-4 py-2.5 text-center text-sm font-medium transition-colors',
              dark
                ? 'bg-[#1E63C8] text-[#F5F9FD] hover:bg-[#57B8F2]'
                : 'bg-[#1E63C8] text-[#F5F9FD] hover:bg-[#154FB8]',
            )}
          >
            Customize
          </Link>
          <AddPresetButton preset={preset} dark={dark}/>
          <Link
            href={`/blend/${preset.id}`}
            className={cn(
              'rounded-full border px-4 py-2.5 text-sm transition-colors',
              dark
                ? 'border-[#F5F9FD]/12 text-[#F5F9FD]/70 hover:bg-[#F5F9FD]/8'
                : 'border-[#CCDFF0] text-[#0E1B33] hover:border-[#1E63C8]/40 hover:bg-[#F5F9FD]',
            )}
          >
            Details
          </Link>
        </div>
      </div>
      </SpotlightCard>
    </article>
  )
}
