import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GlassBottle } from '@/components/glass-bottle'
import { FamilyMix, ProfileBars, ProfileFacts } from '@/components/scent-profile'
import { getPreset, NOTES_BY_ID } from '@/lib/fragrance-data'
import { calculatePrice, formatPrice } from '@/lib/pricing'
import { computeProfile } from '@/lib/scoring'

export default async function BlendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const preset = getPreset(id)
  if (!preset) return notFound()

  const notes = preset.noteIds.map((noteId) => NOTES_BY_ID[noteId]).filter(Boolean)
  const profile = computeProfile(preset.noteIds)
  const price = calculatePrice(preset.noteIds, preset.bottle)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-azure">Blend details</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl md:text-5xl md:leading-none">{preset.name}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{preset.description}</p>
        </div>
        <Link href={`/builder?preset=${preset.id}`} className="inline-flex rounded-full bg-ink px-5 py-3 text-sm font-medium text-ice transition hover:bg-sapphire-mid">
          Customize this blend
        </Link>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="overflow-hidden rounded-[1.5rem] bg-ice/60 p-5">
            <div className="relative mx-auto max-w-[280px]">
              <GlassBottle name={preset.name} bottle={preset.bottle} color={profile?.color} noteCount={preset.noteIds.length} className="mx-auto" />
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-ice/70 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-azure">Blend narrative</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              {notes.map((note) => note.name).join(' · ')}
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-azure">Scent profile</p>
            {profile ? (
              <>
                <div className="mt-4 rounded-2xl bg-ice/80 p-4">
                  <FamilyMix profile={profile} />
                </div>
                <div className="mt-5">
                  <ProfileBars profile={profile} />
                </div>
                <div className="mt-6">
                  <ProfileFacts profile={profile} />
                </div>
              </>
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-azure">Blend pricing</p>
            <div className="mt-4 space-y-3 text-sm text-ink">
              {price.lines.map((line) => (
                <div key={line.label} className="flex items-center justify-between gap-3">
                  <span>{line.label}</span>
                  <span>{formatPrice(line.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-ink p-4 text-ice">
              <p className="text-[0.7rem] uppercase tracking-[0.25em] text-azure-light">Estimated total</p>
              <p className="mt-2 font-serif text-4xl">{formatPrice(price.unitTotal)}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-[2rem] border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-3xl text-ink">Notes</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="relative size-12 overflow-hidden rounded-xl border border-border bg-ice">
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${note.color}, #EFF7FE)` }} />
                </div>
                <div>
                  <p className="font-medium text-ink">{note.name}</p>
                  <p className="text-xs text-muted-foreground">{note.layer} · {note.family}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{note.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
