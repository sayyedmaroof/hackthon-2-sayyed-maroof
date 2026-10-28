import Image from 'next/image'
import Link from 'next/link'
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
          ? 'border-[#FAF7F0]/8 bg-[#2C1A24] text-[#FAF7F0]'
          : 'border-[#E5D8C4] bg-[#FFFEFC] text-[#30241F]',
      )}
    >
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
            dark ? 'from-[#2C1A24]/70' : 'from-[#24101F]/40',
          )}
        />
        {preset.popular && (
          <span className="absolute left-3 top-3 rounded-full bg-[#B88A3B]/90 px-2.5 py-1 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-[#FAF7F0]">
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
            <p className={cn('mt-0.5 text-sm', dark ? 'text-[#FAF7F0]/60' : 'text-[#8B7B72]')}>
              {preset.tagline}
            </p>
          </div>
          <p className="shrink-0 font-serif text-lg text-[#B88A3B]">{formatPrice(price)}</p>
        </div>

        {/* Family pills */}
        <ul className="flex flex-wrap gap-1.5" aria-label="Fragrance families">
          {preset.families.map((family) => (
            <li
              key={family}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs',
                dark
                  ? 'border-[#FAF7F0]/12 text-[#FAF7F0]/55'
                  : 'border-[#E5D8C4] text-[#8B7B72]',
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
                ? 'bg-[#B88A3B] text-[#FAF7F0] hover:bg-[#D4B16A]'
                : 'bg-[#351329] text-[#FAF7F0] hover:bg-[#B88A3B]',
            )}
          >
            Customize
          </Link>
          <Link
            href={`/blend/${preset.id}`}
            className={cn(
              'rounded-full border px-4 py-2.5 text-sm transition-colors',
              dark
                ? 'border-[#FAF7F0]/12 text-[#FAF7F0]/70 hover:bg-[#FAF7F0]/8'
                : 'border-[#E5D8C4] text-[#30241F] hover:border-[#B88A3B]/40 hover:bg-[#FAF7F0]',
            )}
          >
            Details
          </Link>
        </div>
      </div>
    </article>
  )
}
