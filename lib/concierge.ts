import { FAMILY_LABELS, LAYERS, NOTES, NOTES_BY_ID, OCCASION_LABELS } from './fragrance-data'
import { computeProfile, longevityHours, notesFromIds } from './scoring'
import { validateAdd, validateBlend } from './validation'
import type {
  ConciergeInput,
  ConciergeRecommendation,
  Family,
  FragranceNote,
  Layer,
  RecommendationTier,
  ScentProfile,
} from './types'

interface Target {
  freshness: number
  sweetness: number
  warmth: number
  intensity: number
  families: Family[]
  avoidFamilies: Family[]
  avoidNotes: string[]
}

const FAMILY_KEYWORDS: Record<Family, string[]> = {
  woody: ['wood', 'woody', 'cedar', 'sandal', 'oud', 'forest', 'earthy'],
  floral: ['floral', 'flower', 'rose', 'jasmine', 'bloom', 'iris', 'petal'],
  citrus: ['citrus', 'lemon', 'bergamot', 'zesty', 'zest', 'grapefruit', 'orange'],
  fresh: ['fresh', 'clean', 'aquatic', 'sea', 'airy', 'marine', 'crisp', 'green'],
  spicy: ['spice', 'spicy', 'pepper', 'cinnamon', 'cardamom'],
  gourmand: ['gourmand', 'vanilla', 'sugary', 'dessert', 'caramel', 'tonka'],
  amber: ['amber', 'resin', 'cozy', 'cosy', 'oriental', 'glow'],
}

const clamp = (v: number) => Math.min(10, Math.max(0, v))

function includesAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w))
}

function parseAvoid(text: string) {
  const avoidNotes = new Set<string>()
  const avoidFamilies = new Set<Family>()
  const phrases = text.match(/(?:no|avoid|without|not|hate|dislike)\s+(?:too\s+)?([a-z\s-]{3,30})/g) ?? []
  for (const phrase of phrases) {
    for (const note of NOTES) {
      const first = note.name.toLowerCase().split(' ').pop() ?? ''
      if (phrase.includes(note.id.replace('-', ' ')) || phrase.includes(first)) avoidNotes.add(note.id)
    }
    for (const [family, words] of Object.entries(FAMILY_KEYWORDS) as [Family, string[]][]) {
      if (includesAny(phrase, words)) avoidFamilies.add(family)
    }
  }
  return { avoidNotes: [...avoidNotes], avoidFamilies: [...avoidFamilies] }
}

export function buildTarget(input: ConciergeInput): Target {
  const text = [input.freeText, input.mood, input.occasion].filter(Boolean).join(' ').toLowerCase()
  const t: Target = {
    freshness: 5,
    sweetness: 4.5,
    warmth: 5,
    intensity: 5.5,
    families: [...input.families],
    avoidFamilies: [],
    avoidNotes: [],
  }

  const { avoidNotes, avoidFamilies } = parseAvoid(text)
  t.avoidNotes.push(...avoidNotes)
  t.avoidFamilies.push(...avoidFamilies)

  for (const avoided of input.avoid) {
    if (avoided in FAMILY_KEYWORDS) t.avoidFamilies.push(avoided as Family)
    else if (NOTES_BY_ID[avoided]) t.avoidNotes.push(avoided)
    else if (avoided === 'sweet') t.sweetness = 1.5
    else if (avoided === 'heavy') t.intensity = Math.min(t.intensity, 4)
  }

  const positiveText = text.replace(/(?:no|avoid|without|not|hate|dislike)\s+(?:too\s+)?[a-z-]+/g, '')
  for (const [family, words] of Object.entries(FAMILY_KEYWORDS) as [Family, string[]][]) {
    if (includesAny(positiveText, words) && !t.families.includes(family) && !t.avoidFamilies.includes(family)) {
      t.families.push(family)
    }
  }

  if (includesAny(text, ['evening', 'night', 'date', 'dinner', 'romantic', 'sensual'])) {
    t.warmth += 2
    t.intensity += 1
    t.freshness -= 1
  }
  if (includesAny(text, ['office', 'work', 'meeting', 'everyday', 'daily'])) {
    t.intensity -= 1.5
    t.freshness += 1
  }
  if (includesAny(text, ['summer', 'beach', 'daytime', 'morning', 'energ'])) t.freshness += 2
  if (includesAny(text, ['winter', 'autumn', 'fall', 'fireside'])) t.warmth += 2
  if (includesAny(text, ['sophisticated', 'elegant', 'refined'])) t.sweetness -= 1
  if (includesAny(text, ['mysterious', 'dark', 'seductive'])) {
    t.warmth += 1.5
    t.intensity += 1
  }
  if (includesAny(text, ['calm', 'relax', 'soft', 'cozy', 'cosy'])) t.intensity -= 1

  if (text.includes('little sweet') || text.includes('a bit sweet') || text.includes('slightly sweet')) t.sweetness = 5
  else if (includesAny(text, ['very sweet', 'sweet tooth', 'sugary'])) t.sweetness = 8
  else if (text.includes('not too sweet') || text.includes('not sweet')) t.sweetness = 2
  if (text.includes('moderate fresh')) t.freshness = 5.5

  if (input.intensity === 'subtle' || includesAny(text, ['subtle', 'light', 'intimate', 'skin scent'])) t.intensity = 3.5
  if (input.intensity === 'moderate') t.intensity = 5.5
  if (input.intensity === 'bold' || includesAny(text, ['bold', 'strong', 'statement', 'beast'])) t.intensity = 8

  t.freshness = clamp(t.freshness)
  t.sweetness = clamp(t.sweetness)
  t.warmth = clamp(t.warmth)
  t.intensity = clamp(t.intensity)
  t.families = t.families.filter((f) => !t.avoidFamilies.includes(f))
  return t
}

const TIER_SHAPE: Record<RecommendationTier, Record<Layer, number>> = {
  Safe: { top: 1, middle: 2, base: 2 },
  Balanced: { top: 2, middle: 2, base: 2 },
  Bold: { top: 2, middle: 1, base: 2 },
}

function scoreNote(note: FragranceNote, target: Target, tier: RecommendationTier, used: Set<string>) {
  const a = note.attributes
  const distance = Math.sqrt(
    (a.freshness - target.freshness) ** 2 +
      (a.sweetness - target.sweetness) ** 2 +
      (a.warmth - target.warmth) ** 2 +
      (a.intensity - target.intensity) ** 2,
  )
  let score = -distance
  const familyIndex = target.families.indexOf(note.family)
  if (familyIndex === 0) score += 3
  else if (familyIndex > 0) score += 2

  if (tier === 'Safe') score -= a.polarizing * 0.4
  if (tier === 'Balanced') score -= a.polarizing * 0.1 + (used.has(note.id) ? 1.2 : 0)
  if (tier === 'Bold') score += a.polarizing * 0.35 + a.intensity * 0.2 - (used.has(note.id) ? 2.5 : 0)
  return score
}

function pickBlend(target: Target, tier: RecommendationTier, used: Set<string>) {
  const chosen: string[] = []
  let relaxed = false

  for (const layer of LAYERS) {
    const allowed = (n: FragranceNote) =>
      n.layer === layer && !target.avoidNotes.includes(n.id) && !target.avoidFamilies.includes(n.family)
    let candidates = NOTES.filter(allowed)
    if (candidates.length === 0) {
      relaxed = true
      candidates = NOTES.filter((n) => n.layer === layer && !target.avoidNotes.includes(n.id))
    }
    const ranked = candidates
      .map((note) => ({ note, score: scoreNote(note, target, tier, used) }))
      .sort((a, b) => b.score - a.score)

    let added = 0
    for (const { note } of ranked) {
      if (added >= TIER_SHAPE[tier][layer]) break
      if (validateAdd(chosen, note.id).ok) {
        chosen.push(note.id)
        added += 1
      }
    }
  }

  // Safety net: the recommendation must always pass the same validation the builder uses.
  let validation = validateBlend(chosen)
  while (validation.issues.length > 0) {
    const issue = validation.issues[0]
    chosen.splice(chosen.indexOf(issue.noteB.id), 1)
    validation = validateBlend(chosen)
  }
  return { noteIds: chosen, relaxed }
}

const NAMES: Record<Family, string[]> = {
  woody: ['Quiet Timber', 'Cedar Hour', 'Ember Grove'],
  floral: ['Petal Study', 'Velvet Hour', 'Blush Atelier'],
  citrus: ['Golden Zest', 'Riviera Light', 'Morning Grove'],
  fresh: ['Linen Air', 'Salt & Sky', 'Clear Water'],
  spicy: ['Spice Route', 'Copper Flame', 'Night Bazaar'],
  gourmand: ['Velvet Crème', 'Sweet Ember', 'Tonka Silk'],
  amber: ['Amber Hour', 'Golden Hearth', 'Resin Glow'],
}

const TIER_SUMMARY: Record<RecommendationTier, string> = {
  Safe: 'Easy to love, effortless to wear.',
  Balanced: 'Polished and characterful, with a confident twist.',
  Bold: 'A statement blend with real presence.',
}

function list(names: string[]) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function explain(noteIds: string[], profile: ScentProfile, target: Target, relaxed: boolean) {
  const notes = notesFromIds(noteIds)
  const byLayer = (layer: Layer) => notes.filter((n) => n.layer === layer).map((n) => n.name)
  const matched = target.families.filter((f) => profile.familyMix.some((m) => m.family === f))
  const parts = [
    `Opens with ${list(byLayer('top'))}, moves into a heart of ${list(byLayer('middle'))}, and settles on ${list(byLayer('base'))}.`,
    matched.length
      ? `It leans ${list(matched.map((f) => FAMILY_LABELS[f].toLowerCase()))}, as you asked, with ${profile.intensity >= 6.5 ? 'strong' : profile.intensity >= 4.5 ? 'moderate' : 'soft'} intensity and around ${longevityHours(profile.longevity)} on skin.`
      : `It sits in the ${FAMILY_LABELS[profile.family].toLowerCase()} family with ${profile.intensity >= 6.5 ? 'strong' : 'moderate'} intensity.`,
    `Best for ${profile.occasions.map((o) => OCCASION_LABELS[o].toLowerCase()).join(' and ')}.`,
  ]
  if (target.avoidNotes.length || target.avoidFamilies.length) parts.push('Everything you asked us to avoid has been left out.')
  if (relaxed) parts.push('We had to relax one exclusion to keep the blend complete.')
  return parts.join(' ')
}

export function recommendBlends(input: ConciergeInput): ConciergeRecommendation[] {
  const target = buildTarget(input)
  const used = new Set<string>()
  const seed = (input.freeText + input.families.join('')).length

  return (['Safe', 'Balanced', 'Bold'] as RecommendationTier[]).map((tier, index) => {
    const { noteIds, relaxed } = pickBlend(target, tier, used)
    noteIds.forEach((id) => used.add(id))
    const profile = computeProfile(noteIds)
    if (!profile) throw new Error('Could not compose a blend from these preferences.')
    const names = NAMES[profile.family]
    return {
      tier,
      name: names[(seed + index) % names.length],
      noteIds,
      family: profile.family,
      summary: TIER_SUMMARY[tier],
      explanation: explain(noteIds, profile, target, relaxed),
      profile,
    }
  })
}

export function blendTagline(profile: ScentProfile) {
  const fam = FAMILY_LABELS[profile.family]
  const second = profile.familyMix[1] ? FAMILY_LABELS[profile.familyMix[1].family].toLowerCase() : null
  const mood = profile.warmth >= 6 ? 'warm' : profile.freshness >= 6.5 ? 'luminous' : 'soft'
  return second ? `A ${mood} ${fam.toLowerCase()} blend with a ${second} accent` : `A ${mood} ${fam.toLowerCase()} blend`
}

export function describeBlend(noteIds: string[]) {
  const notes = notesFromIds(noteIds)
  const names = (layer: Layer) => notes.filter((n) => n.layer === layer).map((n) => n.name.toLowerCase())
  const top = names('top')
  const mid = names('middle')
  const base = names('base')
  const sentences: string[] = []
  if (top.length) sentences.push(`It opens bright with ${list(top)}.`)
  if (mid.length) sentences.push(`As it warms, a heart of ${list(mid)} unfolds.`)
  if (base.length) sentences.push(`It dries down to a lingering trail of ${list(base)}.`)
  return sentences.join(' ')
}

export interface AnalystAnswer {
  answer: string
  suggestions: { noteId: string; label: string }[]
}

function suggestAdditions(
  noteIds: string[],
  predicate: (n: FragranceNote) => boolean,
  metric: keyof Pick<ScentProfile, 'freshness' | 'warmth' | 'longevity' | 'sweetness'>,
) {
  const before = computeProfile(noteIds)
  return NOTES.filter((n) => predicate(n) && validateAdd(noteIds, n.id).ok)
    .map((n) => {
      const after = computeProfile([...noteIds, n.id])
      return { note: n, delta: (after?.[metric] ?? 0) - (before?.[metric] ?? 0) }
    })
    .filter((s) => s.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2)
}

export function answerScentQuestion(noteIds: string[], question: string): AnalystAnswer {
  const profile = computeProfile(noteIds)
  if (!profile) {
    return {
      answer: 'Add a few notes first and I can tell you how the blend will smell, wear and develop on skin.',
      suggestions: [],
    }
  }
  const q = question.toLowerCase()
  const fmt = (label: string, s: { note: FragranceNote; delta: number }) =>
    `${s.note.name} (${label} +${s.delta.toFixed(1)})`

  if (includesAny(q, ['fresh', 'lighter', 'brighter', 'summer'])) {
    const ideas = suggestAdditions(noteIds, (n) => n.attributes.freshness >= 8, 'freshness')
    return {
      answer: ideas.length
        ? `Freshness currently sits at ${profile.freshness}/10. The cleanest lift would come from ${list(ideas.map((s) => fmt('freshness', s)))}. Both are compatible with your current notes.`
        : `Freshness is already ${profile.freshness}/10 and every compatible fresh note is in use. Try removing a heavier base note to let the opening breathe.`,
      suggestions: ideas.map((s) => ({ noteId: s.note.id, label: `Add ${s.note.name}` })),
    }
  }
  if (includesAny(q, ['evening', 'night', 'date', 'warmer', 'sexy', 'darker'])) {
    const ideas = suggestAdditions(noteIds, (n) => n.attributes.warmth >= 7, 'warmth')
    return {
      answer: `Right now the blend reads as ${profile.timeOfDay.toLowerCase()} with warmth at ${profile.warmth}/10. ${
        ideas.length
          ? `For a more evening character, deepen it with ${list(ideas.map((s) => fmt('warmth', s)))}.`
          : 'It already carries most of the warm materials that pair safely with your selection.'
      }`,
      suggestions: ideas.map((s) => ({ noteId: s.note.id, label: `Add ${s.note.name}` })),
    }
  }
  if (includesAny(q, ['long', 'last', 'longevity', 'stay'])) {
    const ideas = suggestAdditions(noteIds, (n) => n.layer === 'base' && n.attributes.longevity >= 8, 'longevity')
    return {
      answer: `Expect roughly ${longevityHours(profile.longevity)} on skin (longevity ${profile.longevity}/10). ${
        ideas.length
          ? `Anchoring the base with ${list(ideas.map((s) => fmt('longevity', s)))} will extend the drydown. Choosing Extrait de Parfum also adds concentration.`
          : 'Switching to Extrait de Parfum is the best way to push it further.'
      }`,
      suggestions: ideas.map((s) => ({ noteId: s.note.id, label: `Add ${s.note.name}` })),
    }
  }
  if (includesAny(q, ['sweet', 'gourmand', 'cosy', 'cozy'])) {
    const ideas = suggestAdditions(noteIds, (n) => n.attributes.sweetness >= 6, 'sweetness')
    return {
      answer: `Sweetness is at ${profile.sweetness}/10. ${ideas.length ? `To soften it, consider ${list(ideas.map((s) => fmt('sweetness', s)))}.` : 'The compatible sweet notes are already in play.'}`,
      suggestions: ideas.map((s) => ({ noteId: s.note.id, label: `Add ${s.note.name}` })),
    }
  }
  if (includesAny(q, ['work', 'together', 'why', 'balance', 'harmon'])) {
    const notes = notesFromIds(noteIds)
    const families = profile.familyMix.slice(0, 3).map((f) => `${FAMILY_LABELS[f.family].toLowerCase()} (${Math.round(f.share * 100)}%)`)
    const validation = validateBlend(noteIds)
    return {
      answer: `The ${notes.length} notes share a ${list(families)} structure, so each layer hands off smoothly to the next. ${
        validation.missingLayers.length
          ? `It still needs a ${validation.missingLayers.join(' and ')} note to feel complete.`
          : 'All three layers are represented, which gives it a clear opening, heart and drydown.'
      } No clash rules are triggered, and crowd appeal sits at ${profile.crowdAppeal}/10.`,
      suggestions: [],
    }
  }
  if (includesAny(q, ['office', 'subtle', 'quiet', 'lighter projection'])) {
    const loudest = notesFromIds(noteIds).sort((a, b) => b.attributes.intensity - a.attributes.intensity)[0]
    return {
      answer: `Projection is ${profile.projection}/10. ${
        profile.projection > 6
          ? `${loudest.name} is doing most of the projecting; removing it or choosing Eau de Toilette will make it office-friendly.`
          : 'It is already discreet enough for close-quarters wear.'
      }`,
      suggestions: [],
    }
  }
  return {
    answer: `${describeBlend(noteIds)} Overall it is a ${profile.character.toLowerCase()}, ${FAMILY_LABELS[profile.family].toLowerCase()}-led blend best suited to ${profile.occasions
      .map((o) => OCCASION_LABELS[o].toLowerCase())
      .join(' and ')}, lasting around ${longevityHours(profile.longevity)}.`,
    suggestions: [],
  }
}

export const ANALYST_PROMPTS = [
  'How will this smell?',
  'Why do these notes work together?',
  'How can I make it fresher?',
  'Make it better for evening wear',
  'How long will it last?',
]
