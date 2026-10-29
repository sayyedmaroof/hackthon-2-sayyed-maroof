import { FAMILY_LABELS, OCCASION_LABELS, SEASON_LABELS } from '@/lib/fragrance-data'
import { longevityHours } from '@/lib/scoring'
import type { ScentProfile as Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

const FAMILY_COLORS: Record<string, string> = {
  citrus:   '#E3B94F',
  fresh:    '#8FB2B5',
  floral:   '#D58A92',
  woody:    '#8A5A3A',
  amber:    '#1E63C8',
  spicy:    '#A55A2E',
  gourmand: '#D9AE78',
}

const METRICS: { key: keyof Profile; label: string }[] = [
  { key: 'freshness', label: 'Freshness' },
  { key: 'sweetness', label: 'Sweetness' },
  { key: 'warmth', label: 'Warmth' },
  { key: 'intensity', label: 'Intensity' },
  { key: 'longevity', label: 'Longevity' },
  { key: 'projection', label: 'Projection' },
  { key: 'crowdAppeal', label: 'Crowd appeal' },
]

export function FamilyMix({ profile, dark }: { profile: Profile; dark?: boolean }) {
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full" role="img" aria-label={profile.familyMix.map((f) => `${FAMILY_LABELS[f.family]} ${Math.round(f.share * 100)}%`).join(', ')}>
        {profile.familyMix.map((f) => (
          <span
            key={f.family}
            style={{ width: `${f.share * 100}%`, backgroundColor: FAMILY_COLORS[f.family] }}
            className="h-full transition-[width] duration-500"
          />
        ))}
      </div>
      <ul className={cn('mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs', dark ? 'text-ice/70' : 'text-muted-foreground')}>
        {profile.familyMix.map((f) => (
          <li key={f.family} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: FAMILY_COLORS[f.family] }} aria-hidden="true" />
            {FAMILY_LABELS[f.family]} {Math.round(f.share * 100)}%
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProfileBars({ profile, dark, compact }: { profile: Profile; dark?: boolean; compact?: boolean }) {
  const metrics = compact ? METRICS.filter((m) => ['freshness', 'warmth', 'intensity', 'longevity'].includes(m.key)) : METRICS
  return (
    <dl className="space-y-2.5">
      {metrics.map(({ key, label }) => {
        const value = profile[key] as number
        return (
          <div key={key} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
            <dt className={dark ? 'text-ice/75' : 'text-muted-foreground'}>{label}</dt>
            <dd className="contents">
              <span className={cn('h-1.5 overflow-hidden rounded-full', dark ? 'bg-sapphire-mid' : 'bg-secondary')}>
                <span
                  className="block h-full rounded-full bg-azure-light transition-[width] duration-500"
                  style={{ width: `${value * 10}%` }}
                />
              </span>
              <span className={cn('text-right tabular-nums', dark ? 'text-ice' : 'text-foreground')}>{value.toFixed(1)}</span>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export function ProfileFacts({ profile, dark }: { profile: Profile; dark?: boolean }) {
  const facts = [
    { label: 'Family', value: FAMILY_LABELS[profile.family] },
    { label: 'Character', value: profile.character },
    { label: 'Wear', value: profile.timeOfDay },
    { label: 'Lasts', value: longevityHours(profile.longevity) },
    { label: 'Occasion', value: profile.occasions.map((o) => OCCASION_LABELS[o]).join(', ') },
    { label: 'Season', value: profile.seasons.map((s) => SEASON_LABELS[s]).join(', ') },
    { label: 'Leans', value: profile.genderLean },
    { label: 'Age range', value: profile.ageRange },
    { label: 'Anchors', value: profile.fixativeNames.length ? profile.fixativeNames.join(', ') : 'None yet' },
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt className={cn('text-[0.65rem] uppercase tracking-[0.2em]', dark ? 'text-azure-light' : 'text-azure')}>{fact.label}</dt>
          <dd className={cn('mt-0.5 max-w-48 text-sm', dark ? 'text-ice' : 'text-foreground')}>{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Wear curve: how the blend unfolds on skin, with realistic windows from the
 * olfactory pyramid (opening ≤ 30 min, heart to ~3 h, drydown 3 h+).
 */
export function EvolutionTimeline({ profile, dark }: { profile: Profile; dark?: boolean }) {
  return (
    <ol>
      {profile.evolution.map((phase, index) => (
        <li key={phase.phase} className="relative flex gap-3 pb-3 last:pb-0">
          {index < profile.evolution.length - 1 && (
            <span
              aria-hidden="true"
              className={cn('absolute top-4 left-[7px] h-full w-px', dark ? 'bg-azure-light/30' : 'bg-[#CCDFF0]')}
            />
          )}
          <span
            className={cn(
              'z-10 mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full border-2',
              dark ? 'border-azure-light bg-[#0E1B33]' : 'border-[#1E63C8] bg-[#FDFEFF]',
            )}
          />
          <div className="min-w-0">
            <p className={cn('text-xs font-medium tracking-wide', dark ? 'text-azure-light' : 'text-[#1E63C8]')}>
              {phase.phase}
              <span className={cn('ml-2 font-normal', dark ? 'text-ice/60' : 'text-[#5C728F]')}>{phase.window}</span>
            </p>
            <p className={cn('mt-1 text-sm', dark ? 'text-ice/85' : 'text-[#41546E]')}>{phase.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
