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
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-ember">Blend details</p>
          <h1 className="mt-3 font-serif text-5xl leading-none text-espresso">{preset.name}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{preset.description}</p>
        </div>
        <Link href={`/builder?preset=${preset.id}`} className="inline-flex rounded-full bg-espresso px-5 py-3 text-sm font-medium text-ivory transition hover:bg-walnut">
          Customize this blend
        </Link>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <div className="overflow-hidden rounded-[1.5rem] bg-ivory/60 p-5">
            <div className="relative mx-auto max-w-[280px]">
              <GlassBottle name={preset.name} bottle={preset.bottle} color={profile?.color} noteCount={preset.noteIds.length} className="mx-auto" />
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-ivory/70 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-ember">Blend narrative</p>
            <p className="mt-2 text-sm leading-relaxed text-espresso">
              {notes.map((note) => note.name).join(' · ')}
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-ember">Scent profile</p>
            {profile ? (
              <>
                <div className="mt-4 rounded-2xl bg-ivory/80 p-4">
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
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-ember">Blend pricing</p>
            <div className="mt-4 space-y-3 text-sm text-espresso">
              {price.lines.map((line) => (
                <div key={line.label} className="flex items-center justify-between gap-3">
                  <span>{line.label}</span>
                  <span>{formatPrice(line.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-espresso p-4 text-ivory">
              <p className="text-[0.7rem] uppercase tracking-[0.25em] text-copper">Estimated total</p>
              <p className="mt-2 font-serif text-4xl">{formatPrice(price.unitTotal)}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-[2rem] border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-3xl text-espresso">Notes</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="relative size-12 overflow-hidden rounded-xl border border-border bg-ivory">
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${note.color}, #f6ead8)` }} />
                </div>
                <div>
                  <p className="font-medium text-espresso">{note.name}</p>
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
