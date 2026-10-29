/**
 * avoid.ts — Resolution of human-readable exclusion entries ("vanilla",
 * "Smoked Oud", "woody") to authoritative catalog IDs and families.
 *
 * Pure and dependency-light so both the deterministic recommendation engine
 * (client + server) and the AI layer share one source of truth. Exclusions
 * resolved here are enforced absolutely — a blend that needs them relaxed
 * fails openly instead.
 */

import { FAMILY_LABELS, NOTES, NOTES_BY_ID } from '@/lib/fragrance-data'
import type { Family } from '@/lib/types'

export interface ResolvedAvoid {
  /** Catalog note IDs the customer excluded. */
  noteIds: string[]
  /** Fragrance families the customer excluded. */
  families: Family[]
  /** Entries we could not map — surfaced honestly in the UI. */
  unknown: string[]
}

const FAMILY_BY_KEY = new Map<string, Family>()
for (const family of Object.keys(FAMILY_LABELS) as Family[]) {
  FAMILY_BY_KEY.set(family, family)
  FAMILY_BY_KEY.set(FAMILY_LABELS[family].toLowerCase(), family)
}

/** Alias table for common customer spellings that differ from catalog ids. */
const ALIASES: Record<string, string> = {
  cedar: 'cedarwood',
  cedarwood: 'cedarwood',
  rose: 'rose',
  vanilla: 'vanilla',
  oud: 'oud',
  oudh: 'oud',
  musk: 'musk',
  amber: 'amber',
  vetiver: 'vetiver',
  'orange blossom': 'orange-blossom',
  'blood orange': 'blood-orange',
  'bitter orange': 'bitter-orange',
  lime: 'lime',
  yuzu: 'yuzu',
  tea: 'tea',
  coffee: 'coffee',
  caramel: 'caramel',
  leather: 'leather',
  tobacco: 'tobacco',
  honey: 'honey',
  jasmine: 'jasmine',
  iris: 'iris',
  'iris root': 'iris',
  orris: 'iris',
  'ylang ylang': 'ylang-ylang',
  'sea salt': 'sea-salt',
  peppermint: 'mint',
  spearmint: 'mint',
  cinnamon: 'cinnamon',
  clove: 'clove',
  saffron: 'saffron',
  ginger: 'ginger',
  cardamom: 'cardamom',
  lavender: 'lavender',
  geranium: 'geranium',
  tuberose: 'tuberose',
  gardenia: 'gardenia',
  coconut: 'coconut',
  almond: 'almond',
  praline: 'praline',
  chocolate: 'chocolate',
  'dark chocolate': 'chocolate',
  patchouli: 'patchouli',
  sandalwood: 'sandalwood',
  incense: 'frankincense',
  frankincense: 'frankincense',
  'birch tar': 'birch',
  'gaiac wood': 'guaiac',
  guaiac: 'guaiac',
  cashmeran: 'cashmeran',
}

/** Descriptors that are vague mood words, never note or family names. */
const NON_NOTE_WORDS = new Set([
  'sweet', 'heavy', 'light', 'strong', 'subtle', 'bold', 'clean', 'sexy',
  'warm', 'cool', 'smooth', 'dark', 'loud', 'quiet', 'soft', 'sugary',
  'syrupy', 'deep', 'sharp', 'smoky', 'creamy', 'green', 'white', 'black',
])

function normalize(entry: string): string {
  return entry
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function singular(word: string): string {
  return word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word
}

/**
 * Resolve exclusion entries. Unknown entries are reported, never guessed.
 */
export function resolveAvoidEntries(entries: readonly string[]): ResolvedAvoid {
  const noteIds = new Set<string>()
  const families = new Set<Family>()
  const unknown: string[] = []

  for (const raw of entries) {
    const entry = normalize(raw)
    if (!entry) continue
    if (NON_NOTE_WORDS.has(entry)) {
      // Vague descriptor, not a selectable material — reported as unresolvable
      // so the caller can explain it, never guessed into an exclusion.
      unknown.push(raw.trim())
      continue
    }

    // Direct family label ("woody", "Woody", "spicy").
    const family = FAMILY_BY_KEY.get(entry) ?? (FAMILY_BY_KEY.has(singular(entry)) ? FAMILY_BY_KEY.get(singular(entry)) : undefined)
    if (family) {
      families.add(family)
      continue
    }

    // Named alias.
    const alias = ALIASES[entry] ?? ALIASES[singular(entry)]
    if (alias && NOTES_BY_ID[alias]) {
      noteIds.add(alias)
      continue
    }

    // Catalog id, exact name, or distinctive word of a name.
    const direct = NOTES.find((note) => {
      if (note.id === entry) return true
      const name = note.name.toLowerCase()
      if (name === entry) return true
      const words = name.split(/\s+/).map(singular)
      return words.includes(entry) || (entry.length >= 4 && words.some((w) => w === entry))
    })
    if (direct) {
      noteIds.add(direct.id)
      continue
    }

    unknown.push(raw.trim())
  }

  return { noteIds: [...noteIds], families: [...families], unknown }
}
