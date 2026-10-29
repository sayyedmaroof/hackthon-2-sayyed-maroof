import { NOTES } from '@/data/notes'
import type {
  BottleOptions,
  ClashRule,
  Family,
  FragranceNote,
  FragrancePreset,
  Layer,
  Occasion,
  Season,
} from './types'

export { NOTES }

export const LAYERS: Layer[] = ['top', 'middle', 'base']

export const LAYER_INFO: Record<
  Layer,
  { label: string; short: string; description: string; duration: string }
> = {
  top: {
    label: 'Top notes',
    short: 'Top',
    description:
      'The first impression. Bright and volatile, they greet you in the opening minutes.',
    duration: '0 – 30 min',
  },
  middle: {
    label: 'Middle notes',
    short: 'Heart',
    description:
      'The heart of the fragrance. They emerge as the opening fades and define its character.',
    duration: '30 min – 4 h',
  },
  base: {
    label: 'Base notes',
    short: 'Base',
    description:
      'The lasting trail. Rich, slow materials that anchor the blend on skin for hours.',
    duration: '4 h and beyond',
  },
}

export const FAMILIES: Family[] = [
  'woody',
  'floral',
  'citrus',
  'amber',
  'fresh',
  'spicy',
  'gourmand',
]

export const FAMILY_LABELS: Record<Family, string> = {
  citrus: 'Citrus',
  fresh: 'Fresh',
  floral: 'Floral',
  woody: 'Woody',
  amber: 'Amber',
  spicy: 'Spicy',
  gourmand: 'Gourmand',
}

export const OCCASION_LABELS: Record<Occasion, string> = {
  day: 'Daytime',
  office: 'Office',
  evening: 'Evening',
  date: 'Date night',
  special: 'Special occasion',
}

export const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
}

export const NOTES_BY_ID: Record<string, FragranceNote> = Object.fromEntries(
  NOTES.map(note => [note.id, note]),
)

export function getNote(id: string): FragranceNote | undefined {
  return NOTES_BY_ID[id]
}

/**
 * Configurable product rules for ScentBuild Studio. These reflect our house style,
 * not universal perfumery facts.
 */
export const CLASH_RULES: ClashRule[] = [
  {
    id: 'lemon-vanilla',
    notes: ['lemon', 'vanilla'],
    reason:
      'Sharp lemon acidity tends to curdle against creamy vanilla, leaving the blend sour rather than bright.',
    alternatives: {
      lemon: ['bergamot', 'grapefruit'],
      vanilla: ['tonka', 'sandalwood'],
    },
  },
  {
    id: 'lavender-oud',
    notes: ['lavender', 'oud'],
    reason:
      'Herbal lavender and smoky oud pull in opposite directions and often turn medicinal together.',
    alternatives: {
      lavender: ['bergamot', 'cardamom'],
      oud: ['cedarwood', 'sandalwood'],
    },
  },
  {
    id: 'apple-oud',
    notes: ['green-apple', 'oud'],
    reason:
      'Juicy apple is easily flattened by heavy oud, leaving a muddy, almost fermented impression.',
    alternatives: {
      'green-apple': ['pink-pepper', 'bergamot'],
      oud: ['sandalwood', 'amber'],
    },
  },
  {
    id: 'iris-patchouli',
    notes: ['iris', 'patchouli'],
    reason:
      'Powdery iris and earthy patchouli compete for attention and can turn the blend dusty and flat.',
    alternatives: {
      iris: ['rose', 'orange-blossom'],
      patchouli: ['cedarwood', 'musk'],
    },
  },
  {
    id: 'jasmine-cinnamon',
    notes: ['jasmine', 'cinnamon'],
    reason:
      'Heady jasmine and hot cinnamon both project strongly; combined they tend to feel cloying.',
    alternatives: {
      jasmine: ['rose', 'orange-blossom'],
      cinnamon: ['cardamom', 'amber'],
    },
  },
  {
    id: 'mint-oud',
    notes: ['mint', 'oud'],
    reason:
      "Spearmint's cool sharpness clashes with oud's dark resinous depth, creating a jarring medicinal effect.",
    alternatives: {
      mint: ['sea-salt', 'water-lotus'],
      oud: ['cedarwood', 'vetiver'],
    },
  },
  {
    id: 'tuberose-clove',
    notes: ['tuberose', 'clove'],
    reason:
      "The narcotic richness of tuberose overwhelmed by clove's pungency becomes suffocating.",
    alternatives: {
      tuberose: ['jasmine', 'orange-blossom'],
      clove: ['cinnamon', 'nutmeg'],
    },
  },
  {
    id: 'muguet-patchouli',
    notes: ['muguet', 'patchouli'],
    reason:
      'Delicate lily of the valley is completely swamped by earthy patchouli, losing all freshness.',
    alternatives: {
      muguet: ['rose', 'iris'],
      patchouli: ['vetiver', 'cedarwood'],
    },
  },
  {
    id: 'yuzu-labdanum',
    notes: ['yuzu', 'labdanum'],
    reason:
      'Bright tart yuzu and heavy dark labdanum sit at opposite extremes — together they feel unresolved.',
    alternatives: {
      yuzu: ['bergamot', 'mandarin'],
      labdanum: ['amber', 'frankincense'],
    },
  },
  {
    id: 'galbanum-oud',
    notes: ['galbanum', 'oud'],
    reason:
      'Bitter snapped-stem galbanum and smoky oud fight for the same space and often turn medicinal together.',
    alternatives: {
      galbanum: ['vetiver', 'petitgrain'],
      oud: ['cedarwood', 'sandalwood'],
    },
  },
  {
    id: 'rosemary-oud',
    notes: ['rosemary', 'oud'],
    reason:
      "Rosemary's camphor sharpness clashes with oud's resinous depth, leaving a jarring herbal-smoke effect.",
    alternatives: {
      rosemary: ['lavender', 'cardamom'],
      oud: ['cedarwood', 'guaiac'],
    },
  },
  {
    id: 'cumin-jasmine',
    notes: ['cumin', 'jasmine'],
    reason:
      'Indolic jasmine and skin-salt cumin both carry an animalic facet; together the dominant note doubles until the blend smells unwearable.',
    alternatives: {
      cumin: ['cardamom', 'saffron'],
      jasmine: ['orange-blossom', 'magnolia'],
    },
  },
]

export const DEFAULT_BOTTLE: BottleOptions = {
  size: 50,
  concentration: 'edp',
  bottleType: 'classic',
  atomizerMaterial: 'metal',
  atomizerType: 'normal',
  labelStyle: 'ivory',
  base: 'alcohol',
}

export const PRESETS: FragrancePreset[] = [
  {
    id: 'royal-ember',
    name: 'Royal Ember',
    tagline: 'Warm, woody, amber',
    description:
      'A glowing fireside composition. Pink pepper and bergamot crackle over rose and cinnamon before settling into smoked oud and golden amber.',
    families: ['woody', 'amber'],
    image: '/images/preset-royal-ember.png',
    noteIds: ['pink-pepper', 'bergamot', 'rose', 'cinnamon', 'oud', 'amber'],
    occasions: ['evening', 'special'],
    seasons: ['autumn', 'winter'],
    featured: true,
    popular: true,
    bottle: { ...DEFAULT_BOTTLE, bottleType: 'designer', labelStyle: 'noir' },
  },
  {
    id: 'azure-wood',
    name: 'Azure Wood',
    tagline: 'Fresh, aromatic, woody',
    description:
      'A coastal morning in a bottle. Bergamot and mint drift over mineral sea salt and water lotus, grounded by dry cedar and clean musk.',
    families: ['fresh', 'woody', 'citrus'],
    image: '/images/preset-azure-wood.png',
    noteIds: ['bergamot', 'lavender', 'sea-salt', 'cedarwood', 'musk'],
    occasions: ['day', 'office'],
    seasons: ['spring', 'summer'],
    featured: true,
    popular: true,
    bottle: { ...DEFAULT_BOTTLE, labelStyle: 'ivory' },
  },
  {
    id: 'velvet-bloom',
    name: 'Velvet Bloom',
    tagline: 'Floral, soft, sweet',
    description:
      'A bouquet wrapped in cashmere. Rose, jasmine and orange blossom bloom over a creamy veil of vanilla and musk.',
    families: ['floral', 'gourmand'],
    image: '/images/preset-velvet-bloom.png',
    noteIds: [
      'bergamot',
      'rose',
      'jasmine',
      'orange-blossom',
      'vanilla',
      'musk',
    ],
    occasions: ['date', 'day'],
    seasons: ['spring', 'summer'],
    featured: true,
    popular: false,
    bottle: { ...DEFAULT_BOTTLE, labelStyle: 'copper' },
  },
  {
    id: 'noir-spice',
    name: 'Noir Spice',
    tagline: 'Spicy, dark, warm',
    description:
      'After-hours intensity. Cardamom and pink pepper spark into hot cinnamon, then sink into patchouli, tonka and amber.',
    families: ['spicy', 'amber', 'woody'],
    image: '/images/preset-noir-spice.png',
    noteIds: [
      'cardamom',
      'pink-pepper',
      'cinnamon',
      'patchouli',
      'tonka',
      'amber',
    ],
    occasions: ['evening', 'date'],
    seasons: ['autumn', 'winter'],
    featured: true,
    popular: true,
    bottle: {
      ...DEFAULT_BOTTLE,
      bottleType: 'designer',
      labelStyle: 'noir',
      concentration: 'parfum',
    },
  },
  // ─── INSPIRED BY DESIGNER FRAGRANCES ─────────────────────────────────────────
  {
    id: 'aventus-inspired',
    name: 'Imperial Pineapple',
    tagline: 'Fruity, woody, confident',
    description:
      'A powerful fruity-woody composition. Black currant and green apple open over jasmine and patchouli, grounded by cedarwood and ambroxan.',
    families: ['woody', 'citrus', 'fresh'],
    image: '/images/notes/apple.png',
    noteIds: [
      'bergamot',
      'green-apple',
      'pink-pepper',
      'jasmine',
      'patchouli',
      'cedarwood',
      'ambroxan',
    ],
    occasions: ['day', 'evening', 'special'],
    seasons: ['spring', 'summer', 'autumn'],
    featured: false,
    popular: false,
    inspiredBy: 'Inspired by Creed Aventus',
    bottle: { ...DEFAULT_BOTTLE, concentration: 'edp', labelStyle: 'noir' },
  },
  {
    id: 'citrus-atelier',
    name: 'Citrus Atelier',
    tagline: 'Zesty, clean, effortless',
    description:
      'A crisp cologne-style profile. Lemon and grapefruit sparkle over orange blossom on a clean base of cedar and musk.',
    families: ['citrus', 'fresh'],
    image: '/images/notes/citrus.png',
    noteIds: ['lemon', 'grapefruit', 'orange-blossom', 'cedarwood', 'musk'],
    occasions: ['day', 'office'],
    seasons: ['summer', 'spring'],
    featured: false,
    popular: false,
    inspiredBy: 'Inspired by Acqua di Parma Colonia',
    bottle: { ...DEFAULT_BOTTLE, concentration: 'edt' },
  },
  {
    id: 'sauvage-accord',
    name: 'Sauvage Accord',
    tagline: 'Fresh, aromatic, woody',
    description:
      'A modern fresh-spicy woody profile. Bergamot and pink pepper open with lavender over a mineral sea-salt heart, grounded by cedar and ambroxan.',
    families: ['fresh', 'spicy', 'woody'],
    image: '/images/notes/lavender.png',
    noteIds: [
      'bergamot',
      'pink-pepper',
      'lavender',
      'sea-salt',
      'cedarwood',
      'ambroxan',
    ],
    occasions: ['day', 'evening'],
    seasons: ['spring', 'summer', 'autumn'],
    featured: false,
    popular: false,
    inspiredBy: 'Inspired by Dior Sauvage',
    bottle: { ...DEFAULT_BOTTLE, concentration: 'edt' },
  },
  {
    id: 'fleur-orient',
    name: "Fleur d'Orient",
    tagline: 'Opulent, floral, oriental',
    description:
      'A rich oriental floral masterpiece. Rose, jasmine and orange blossom bloom over a deep base of amber, frankincense and musk.',
    families: ['floral', 'amber'],
    image: '/images/notes/rose.png',
    noteIds: [
      'rose',
      'jasmine',
      'orange-blossom',
      'amber',
      'frankincense',
      'musk',
    ],
    occasions: ['evening', 'special', 'date'],
    seasons: ['autumn', 'winter'],
    featured: false,
    popular: false,
    inspiredBy: 'Inspired by Mugler Alien',
    bottle: { ...DEFAULT_BOTTLE, concentration: 'edp', labelStyle: 'copper' },
  },
  {
    id: 'baccarat-oud',
    name: 'Ambre Cristal',
    tagline: 'Rich, luminous, addictive',
    description:
      'A radiant amber recipe. Jasmine petals melt into glowing amber over a hypnotic sweetness of tonka, caramel and cedar.',
    families: ['amber', 'gourmand', 'floral'],
    image: '/images/notes/amber.png',
    noteIds: ['jasmine', 'amber', 'cedarwood', 'ambroxan', 'tonka', 'caramel'],
    occasions: ['evening', 'special', 'date'],
    seasons: ['winter', 'autumn'],
    featured: false,
    popular: false,
    inspiredBy: 'Inspired by Maison Francis Kurkdjian Baccarat Rouge 540',
    bottle: {
      ...DEFAULT_BOTTLE,
      concentration: 'parfum',
      bottleType: 'designer',
      labelStyle: 'noir',
    },
  },
  {
    id: 'aqua-cool',
    name: 'Aqua Cool',
    tagline: 'Light, aquatic, Mediterranean',
    description:
      'A clean aquatic escape. Bergamot and mandarin open over water lotus and sea-salt, grounded by musk and cedarwood.',
    families: ['fresh', 'citrus'],
    image: '/images/notes/aquatic.png',
    noteIds: [
      'bergamot',
      'mandarin',
      'water-lotus',
      'sea-salt',
      'musk',
      'cedarwood',
    ],
    occasions: ['day', 'office'],
    seasons: ['summer', 'spring'],
    featured: false,
    popular: false,
    inspiredBy: 'Inspired by Acqua di Giò',
    bottle: { ...DEFAULT_BOTTLE, concentration: 'edt' },
  },
  {
    id: 'indigo-legacy',
    name: 'Indigo Legacy',
    tagline: 'Fresh, woody, timeless',
    description:
      'A confident woody-aromatic signature. Grapefruit and mint sparkle over jasmine and nutmeg, on a polished base of cedar, sandalwood and ambroxan.',
    families: ['woody', 'fresh', 'citrus'],
    image: '/images/notes/woods.png',
    noteIds: [
      'grapefruit',
      'mint',
      'jasmine',
      'nutmeg',
      'cedarwood',
      'sandalwood',
      'ambroxan',
    ],
    occasions: ['day', 'office', 'evening'],
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    featured: false,
    popular: false,
    inspiredBy: 'Inspired by Bleu de Chanel',
    bottle: { ...DEFAULT_BOTTLE, concentration: 'edp', labelStyle: 'noir' },
  },
  {
    id: 'tobacco-velvet',
    name: 'Tobacco Velvet',
    tagline: 'Warm, sweet, opulent',
    description:
      'A decadent tobacco-vanilla masterpiece. Spiced clove and cinnamon swirl over tonka, vanilla and amber resin in a veil of caramel.',
    families: ['gourmand', 'spicy', 'amber'],
    image: '/images/notes/vanilla.png',
    noteIds: ['tonka', 'vanilla', 'cinnamon', 'clove', 'benzoin', 'caramel'],
    occasions: ['evening', 'date', 'special'],
    seasons: ['autumn', 'winter'],
    featured: false,
    popular: false,
    inspiredBy: 'Inspired by Tom Ford Tobacco Vanille',
    bottle: {
      ...DEFAULT_BOTTLE,
      concentration: 'parfum',
      bottleType: 'designer',
      labelStyle: 'noir',
    },
  },
  {
    id: 'liberte-bloom',
    name: 'Liberté Bloom',
    tagline: 'Floral, daring, free',
    description:
      'An elegant French floral. Sunlit lavender meets blooming orange blossom, melting into a warm embrace of vanilla, amber and musk.',
    families: ['floral', 'amber', 'fresh'],
    image: '/images/notes/lavender.png',
    noteIds: ['lavender', 'orange-blossom', 'vanilla', 'amber', 'musk'],
    occasions: ['date', 'day', 'evening'],
    seasons: ['spring', 'autumn'],
    featured: false,
    popular: false,
    inspiredBy: 'Inspired by Yves Saint Laurent Libre',
    bottle: { ...DEFAULT_BOTTLE, concentration: 'edp', labelStyle: 'copper' },
  },
  {
    id: 'verdant-desire',
    name: 'Verdant Desire',
    tagline: 'Fresh, seductive, bold',
    description:
      'An intoxicating green-fresh seduction. Mint and zesty lemon flash over green apple, wrapped in a warm creamy base of tonka and vanilla.',
    families: ['fresh', 'citrus', 'woody'],
    image: '/images/notes/apple.png',
    noteIds: [
      'mint',
      'green-apple',
      'lemon',
      'cedarwood',
      'vetiver',
      'tonka',
      'vanilla',
    ],
    occasions: ['evening', 'date'],
    seasons: ['autumn', 'winter', 'spring'],
    featured: false,
    popular: false,
    inspiredBy: 'Inspired by Versace Eros',
    bottle: { ...DEFAULT_BOTTLE, concentration: 'edt', labelStyle: 'noir' },
  },
  {
    id: 'oud-sovereign',
    name: 'Oud Sovereign',
    tagline: 'Rare, creamy, majestic',
    description:
      'A refined oud composition. Smoked oud is softened with cardamom and creamy sandalwood, resting on warm vanilla, tonka and amber.',
    families: ['woody', 'amber'],
    image: '/images/notes/oud.png',
    noteIds: ['oud', 'cardamom', 'sandalwood', 'vanilla', 'tonka', 'amber'],
    occasions: ['evening', 'special'],
    seasons: ['autumn', 'winter'],
    featured: false,
    popular: false,
    inspiredBy: 'Inspired by Tom Ford Oud Wood',
    bottle: {
      ...DEFAULT_BOTTLE,
      concentration: 'parfum',
      bottleType: 'designer',
      labelStyle: 'noir',
    },
  },
]

export function getPreset(id: string): FragrancePreset | undefined {
  return PRESETS.find(preset => preset.id === id)
}
