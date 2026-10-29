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

const img = (name: string) => `/images/notes/${name}.png`

export const NOTES: FragranceNote[] = [
  // ─── TOP NOTES ────────────────────────────────────────────────────────────
  // Citrus family: vivid golden-yellows, pale lemons, rosy oranges
  {
    id: 'bergamot',
    name: 'Bergamot',
    layer: 'top',
    family: 'citrus',
    description:
      'Sparkling Calabrian citrus with a distinctive tea-like bitterness and green radiance.',
    price: 9,
    image: img('citrus'),
    // Fragrantica: bergamot = bright golden-green yellow
    color: '#DFC84A',
    attributes: {
      freshness: 9,
      sweetness: 3,
      warmth: 2,
      intensity: 5,
      longevity: 2,
      projection: 6,
      polarizing: 1,
    },
    occasions: ['day', 'office'],
    seasons: ['spring', 'summer'],
  },
  {
    id: 'lemon',
    name: 'Sicilian Lemon',
    layer: 'top',
    family: 'citrus',
    description:
      'Sharp, zesty and mouthwatering. A burst of pure effervescent brightness.',
    price: 7,
    image: img('citrus'),
    // Fragrantica: lemon = pale bright yellow
    color: '#F2E535',
    attributes: {
      freshness: 10,
      sweetness: 2,
      warmth: 1,
      intensity: 6,
      longevity: 1,
      projection: 6,
      polarizing: 2,
    },
    occasions: ['day', 'office'],
    seasons: ['summer', 'spring'],
  },
  {
    id: 'grapefruit',
    name: 'Pink Grapefruit',
    layer: 'top',
    family: 'citrus',
    description:
      'Juicy and slightly bitter, with a sparkling rosy-golden edge.',
    price: 8,
    image: img('citrus'),
    // Fragrantica: pink grapefruit = warm coral-gold
    color: '#F0A060',
    attributes: {
      freshness: 9,
      sweetness: 3,
      warmth: 1,
      intensity: 5,
      longevity: 2,
      projection: 6,
      polarizing: 3,
    },
    occasions: ['day'],
    seasons: ['summer', 'spring'],
  },
  {
    id: 'mandarin',
    name: 'Mandarin Orange',
    layer: 'top',
    family: 'citrus',
    description:
      'Ripe, sweet and slightly floral. Warmer and rounder than lemon.',
    price: 8,
    image: img('citrus'),
    // Fragrantica: mandarin = deep warm orange
    color: '#F07828',
    attributes: {
      freshness: 7,
      sweetness: 6,
      warmth: 3,
      intensity: 5,
      longevity: 2,
      projection: 5,
      polarizing: 2,
    },
    occasions: ['day', 'office'],
    seasons: ['spring', 'summer', 'autumn'],
  },
  {
    id: 'yuzu',
    name: 'Japanese Yuzu',
    layer: 'top',
    family: 'citrus',
    description:
      'Tart and aromatic Japanese citrus — grapefruit meets lemon meets floral.',
    price: 14,
    image: img('citrus'),
    // Fragrantica: yuzu = pale lime-yellow
    color: '#D8E040',
    attributes: {
      freshness: 9,
      sweetness: 2,
      warmth: 1,
      intensity: 6,
      longevity: 2,
      projection: 7,
      polarizing: 5,
    },
    occasions: ['day'],
    seasons: ['spring', 'summer'],
  },
  // Spicy top notes: warm rosy-reds, olive greens
  {
    id: 'pink-pepper',
    name: 'Pink Pepper',
    layer: 'top',
    family: 'spicy',
    description:
      'A crackling rosy spice that adds lift and fizzing sophistication.',
    price: 11,
    image: img('spice'),
    // Fragrantica: pink pepper = warm rose-red
    color: '#D45060',
    attributes: {
      freshness: 6,
      sweetness: 2,
      warmth: 5,
      intensity: 6,
      longevity: 3,
      projection: 7,
      polarizing: 4,
    },
    occasions: ['evening', 'date'],
    seasons: ['autumn', 'spring'],
  },
  {
    id: 'cardamom',
    name: 'Cardamom',
    layer: 'top',
    family: 'spicy',
    description:
      'Cool green spice with a gentle balsamic warmth. Aromatic and uplifting.',
    price: 12,
    image: img('spice'),
    // Fragrantica: cardamom = muted olive-green
    color: '#8A9A50',
    attributes: {
      freshness: 6,
      sweetness: 3,
      warmth: 6,
      intensity: 5,
      longevity: 4,
      projection: 5,
      polarizing: 4,
    },
    occasions: ['office', 'evening'],
    seasons: ['autumn', 'winter'],
  },
  {
    id: 'black-pepper',
    name: 'Black Pepper',
    layer: 'top',
    family: 'spicy',
    description:
      'Dry, pungent and bracing. Adds a sharp metallic edge to any opening.',
    price: 10,
    image: img('spice'),
    // Fragrantica: black pepper = dark charcoal-grey
    color: '#5A5050',
    attributes: {
      freshness: 5,
      sweetness: 1,
      warmth: 5,
      intensity: 7,
      longevity: 3,
      projection: 7,
      polarizing: 6,
    },
    occasions: ['office', 'evening'],
    seasons: ['autumn', 'winter'],
  },
  // Fresh top notes: greens, aquatics, herbs
  {
    id: 'green-apple',
    name: 'Green Apple',
    layer: 'top',
    family: 'fresh',
    description:
      'Crisp, juicy orchard fruit with a playful bright-green sweetness.',
    price: 6,
    image: img('apple'),
    // Fragrantica: green apple = vivid grass green
    color: '#78C830',
    attributes: {
      freshness: 8,
      sweetness: 6,
      warmth: 1,
      intensity: 4,
      longevity: 2,
      projection: 5,
      polarizing: 3,
    },
    occasions: ['day'],
    seasons: ['spring', 'summer'],
  },
  {
    id: 'lavender',
    name: 'Lavender',
    layer: 'top',
    family: 'fresh',
    description:
      'Herbal and calming, with a clean, soft floral-aromatic undertone.',
    price: 8,
    image: img('lavender'),
    // Fragrantica: lavender = medium purple-violet
    color: '#8060B8',
    attributes: {
      freshness: 8,
      sweetness: 3,
      warmth: 3,
      intensity: 5,
      longevity: 4,
      projection: 6,
      polarizing: 4,
    },
    occasions: ['office', 'day'],
    seasons: ['spring', 'summer'],
  },
  {
    id: 'mint',
    name: 'Spearmint',
    layer: 'top',
    family: 'fresh',
    description:
      'Cool, crisp and reviving. A clean herbal sparkle that electrifies the opening.',
    price: 7,
    image: img('aquatic'),
    // Fragrantica: mint = vivid cool green
    color: '#3EC880',
    attributes: {
      freshness: 10,
      sweetness: 2,
      warmth: 1,
      intensity: 6,
      longevity: 2,
      projection: 6,
      polarizing: 5,
    },
    occasions: ['day', 'office'],
    seasons: ['spring', 'summer'],
  },
  {
    id: 'petitgrain',
    name: 'Petitgrain',
    layer: 'top',
    family: 'fresh',
    description:
      'Woody-green distillation of bitter orange leaves. Dry, aromatic, refined.',
    price: 11,
    image: img('lavender'),
    // Fragrantica: petitgrain = muted sage green
    color: '#6A8848',
    attributes: {
      freshness: 8,
      sweetness: 1,
      warmth: 2,
      intensity: 5,
      longevity: 3,
      projection: 5,
      polarizing: 3,
    },
    occasions: ['office', 'day'],
    seasons: ['spring', 'summer'],
  },

  // ─── MIDDLE / HEART NOTES ─────────────────────────────────────────────────
  // Floral heart notes: vivid pinks, purples, creamy whites
  {
    id: 'rose',
    name: 'Damask Rose',
    layer: 'middle',
    family: 'floral',
    description: 'Velvety honeyed petals with a deep jammy-red heart.',
    price: 16,
    image: img('rose'),
    // Fragrantica: Damask rose = deep warm rose-pink
    color: '#D83060',
    attributes: {
      freshness: 4,
      sweetness: 6,
      warmth: 4,
      intensity: 6,
      longevity: 6,
      projection: 6,
      polarizing: 3,
    },
    occasions: ['date', 'special'],
    seasons: ['spring', 'autumn'],
  },
  {
    id: 'jasmine',
    name: 'Jasmine Sambac',
    layer: 'middle',
    family: 'floral',
    description:
      'Lush heady white flower with indolic depth and creamy warmth.',
    price: 18,
    image: img('jasmine'),
    // Fragrantica: jasmine = warm creamy-white / pale gold
    color: '#F0D870',
    attributes: {
      freshness: 3,
      sweetness: 6,
      warmth: 5,
      intensity: 8,
      longevity: 6,
      projection: 8,
      polarizing: 5,
    },
    occasions: ['evening', 'date'],
    seasons: ['spring', 'summer'],
  },
  {
    id: 'iris',
    name: 'Orris Iris',
    layer: 'middle',
    family: 'floral',
    description:
      'Cool, powdery and elegant — like violet, suede and soft wood.',
    price: 22,
    image: img('iris'),
    // Fragrantica: orris = pale grey-violet / dusty purple
    color: '#9080B0',
    attributes: {
      freshness: 4,
      sweetness: 3,
      warmth: 3,
      intensity: 4,
      longevity: 6,
      projection: 4,
      polarizing: 6,
    },
    occasions: ['office', 'special'],
    seasons: ['autumn', 'spring'],
  },
  {
    id: 'orange-blossom',
    name: 'Orange Blossom',
    layer: 'middle',
    family: 'floral',
    description: 'Sunny honeyed petals with a luminous citrus-floral glow.',
    price: 14,
    image: img('jasmine'),
    // Fragrantica: orange blossom = warm cream-orange
    color: '#F0C050',
    attributes: {
      freshness: 6,
      sweetness: 6,
      warmth: 3,
      intensity: 6,
      longevity: 5,
      projection: 7,
      polarizing: 3,
    },
    occasions: ['day', 'date'],
    seasons: ['spring', 'summer'],
  },
  {
    id: 'tuberose',
    name: 'Tuberose',
    layer: 'middle',
    family: 'floral',
    description:
      'Richly narcotic white floral — creamy, honeyed, and intensely feminine.',
    price: 20,
    image: img('jasmine'),
    // Fragrantica: tuberose = pure creamy white
    color: '#F8F0D8',
    attributes: {
      freshness: 2,
      sweetness: 7,
      warmth: 5,
      intensity: 9,
      longevity: 7,
      projection: 9,
      polarizing: 7,
    },
    occasions: ['evening', 'special', 'date'],
    seasons: ['summer', 'spring'],
  },
  {
    id: 'muguet',
    name: 'Lily of the Valley',
    layer: 'middle',
    family: 'floral',
    description:
      'Delicate, dewy, and transparent. The freshest of all white flowers.',
    price: 15,
    image: img('jasmine'),
    // Fragrantica: lily of the valley = pale spring green-white
    color: '#C8E8C0',
    attributes: {
      freshness: 8,
      sweetness: 4,
      warmth: 2,
      intensity: 5,
      longevity: 4,
      projection: 5,
      polarizing: 3,
    },
    occasions: ['day', 'office'],
    seasons: ['spring'],
  },
  // Spicy middle notes
  {
    id: 'cinnamon',
    name: 'Ceylon Cinnamon',
    layer: 'middle',
    family: 'spicy',
    description: 'Hot sweet bark glowing with festive warmth and woody depth.',
    price: 10,
    image: img('spice'),
    // Fragrantica: cinnamon = deep warm brown-orange
    color: '#C04818',
    attributes: {
      freshness: 1,
      sweetness: 5,
      warmth: 9,
      intensity: 7,
      longevity: 6,
      projection: 6,
      polarizing: 6,
    },
    occasions: ['evening'],
    seasons: ['autumn', 'winter'],
  },
  {
    id: 'clove',
    name: 'Clove',
    layer: 'middle',
    family: 'spicy',
    description:
      'Intensely warm, pungent eugenol spice with a dark, medicinal edge.',
    price: 9,
    image: img('spice'),
    // Fragrantica: clove = deep red-brown
    color: '#8A2818',
    attributes: {
      freshness: 1,
      sweetness: 3,
      warmth: 10,
      intensity: 8,
      longevity: 7,
      projection: 7,
      polarizing: 8,
    },
    occasions: ['evening', 'special'],
    seasons: ['autumn', 'winter'],
  },
  {
    id: 'nutmeg',
    name: 'Nutmeg',
    layer: 'middle',
    family: 'spicy',
    description:
      'Warm, nutty and slightly sweet. A kitchen spice made sophisticated.',
    price: 10,
    image: img('spice'),
    // Fragrantica: nutmeg = warm tan-brown
    color: '#B07840',
    attributes: {
      freshness: 2,
      sweetness: 4,
      warmth: 8,
      intensity: 6,
      longevity: 5,
      projection: 5,
      polarizing: 5,
    },
    occasions: ['evening', 'date'],
    seasons: ['autumn', 'winter'],
  },
  // Fresh aquatic middle notes
  {
    id: 'sea-salt',
    name: 'Sea Salt',
    layer: 'middle',
    family: 'fresh',
    description: 'Mineral, airy and coastal. Like skin after a long swim.',
    price: 9,
    image: img('aquatic'),
    // Fragrantica: sea salt / aquatic = clear teal-blue
    color: '#40B8D0',
    attributes: {
      freshness: 9,
      sweetness: 1,
      warmth: 1,
      intensity: 4,
      longevity: 4,
      projection: 5,
      polarizing: 4,
    },
    occasions: ['day', 'office'],
    seasons: ['summer', 'spring'],
  },
  {
    id: 'water-lotus',
    name: 'Water Lotus',
    layer: 'middle',
    family: 'fresh',
    description:
      'Cool aquatic floral — the scent of lotus rising from a clear lake.',
    price: 13,
    image: img('aquatic'),
    // Fragrantica: lotus = pale blue-lavender
    color: '#78A8D8',
    attributes: {
      freshness: 8,
      sweetness: 3,
      warmth: 2,
      intensity: 5,
      longevity: 5,
      projection: 6,
      polarizing: 4,
    },
    occasions: ['day', 'office'],
    seasons: ['spring', 'summer'],
  },

  // ─── BASE NOTES ──────────────────────────────────────────────────────────
  // Gourmand bases: warm honeys, creams, caramels
  {
    id: 'vanilla',
    name: 'Madagascar Vanilla',
    layer: 'base',
    family: 'gourmand',
    description:
      'Creamy, rich and comforting with a dark boozy vanilla-bean depth.',
    price: 12,
    image: img('vanilla'),
    // Fragrantica: vanilla = warm honey-gold
    color: '#D4A030',
    attributes: {
      freshness: 1,
      sweetness: 9,
      warmth: 7,
      intensity: 5,
      longevity: 8,
      projection: 5,
      polarizing: 2,
    },
    occasions: ['evening', 'date'],
    seasons: ['autumn', 'winter'],
  },
  {
    id: 'tonka',
    name: 'Tonka Bean',
    layer: 'base',
    family: 'gourmand',
    description:
      'Coumarin-rich — almond, hay and caramel with a soft smoky sweetness.',
    price: 11,
    image: img('vanilla'),
    // Fragrantica: tonka = warm caramel-brown
    color: '#C07028',
    attributes: {
      freshness: 1,
      sweetness: 8,
      warmth: 7,
      intensity: 5,
      longevity: 8,
      projection: 5,
      polarizing: 3,
    },
    occasions: ['evening', 'date'],
    seasons: ['autumn', 'winter'],
  },
  {
    id: 'benzoin',
    name: 'Benzoin Resin',
    layer: 'base',
    family: 'gourmand',
    description:
      'Sweet balsamic resin — like warm vanilla-caramel with a powdery haze.',
    price: 13,
    image: img('vanilla'),
    // Fragrantica: benzoin = deep amber-honey
    color: '#B88030',
    attributes: {
      freshness: 1,
      sweetness: 7,
      warmth: 8,
      intensity: 6,
      longevity: 9,
      projection: 6,
      polarizing: 3,
    },
    occasions: ['evening', 'special'],
    seasons: ['autumn', 'winter'],
  },
  {
    id: 'caramel',
    name: 'Salted Caramel',
    layer: 'base',
    family: 'gourmand',
    description: 'Rich, dark burnt sugar with a contrasting salt mineral edge.',
    price: 10,
    image: img('vanilla'),
    // Fragrantica: caramel = deep amber-brown
    color: '#C06020',
    attributes: {
      freshness: 0,
      sweetness: 10,
      warmth: 7,
      intensity: 5,
      longevity: 7,
      projection: 5,
      polarizing: 4,
    },
    occasions: ['evening', 'date'],
    seasons: ['autumn', 'winter'],
  },
  // Woody bases
  {
    id: 'oud',
    name: 'Smoked Oud',
    layer: 'base',
    family: 'woody',
    description:
      'Dark resinous agarwood — the most precious and complex of all bases.',
    price: 24,
    image: img('oud'),
    // Fragrantica: oud = very dark espresso-brown
    color: '#3A1808',
    attributes: {
      freshness: 1,
      sweetness: 2,
      warmth: 8,
      intensity: 10,
      longevity: 10,
      projection: 9,
      polarizing: 9,
    },
    occasions: ['evening', 'special'],
    seasons: ['winter', 'autumn'],
  },
  {
    id: 'sandalwood',
    name: 'Sandalwood',
    layer: 'base',
    family: 'woody',
    description:
      'Creamy milky wood with a smooth meditative depth that lasts all day.',
    price: 18,
    image: img('woods'),
    // Fragrantica: sandalwood = warm pale wood tan
    color: '#C89058',
    attributes: {
      freshness: 2,
      sweetness: 4,
      warmth: 7,
      intensity: 5,
      longevity: 9,
      projection: 5,
      polarizing: 2,
    },
    occasions: ['office', 'evening', 'date'],
    seasons: ['autumn', 'winter', 'spring'],
  },
  {
    id: 'cedarwood',
    name: 'Atlas Cedarwood',
    layer: 'base',
    family: 'woody',
    description:
      'Dry pencil-shaving cedar with a clean, upright, structured aroma.',
    price: 10,
    image: img('woods'),
    // Fragrantica: cedar = dry warm brown
    color: '#A87040',
    attributes: {
      freshness: 4,
      sweetness: 1,
      warmth: 5,
      intensity: 5,
      longevity: 8,
      projection: 5,
      polarizing: 2,
    },
    occasions: ['office', 'day'],
    seasons: ['autumn', 'spring'],
  },
  {
    id: 'vetiver',
    name: 'Haitian Vetiver',
    layer: 'base',
    family: 'woody',
    description:
      'Smoky, earthy grass root — raw, complex, with bitter-green depth.',
    price: 16,
    image: img('patchouli'),
    // Fragrantica: vetiver = deep olive-green
    color: '#5A6830',
    attributes: {
      freshness: 3,
      sweetness: 1,
      warmth: 5,
      intensity: 8,
      longevity: 10,
      projection: 7,
      polarizing: 7,
    },
    occasions: ['office', 'evening'],
    seasons: ['autumn', 'summer'],
  },
  {
    id: 'patchouli',
    name: 'Patchouli',
    layer: 'base',
    family: 'woody',
    description:
      'Earthy, dark and slightly chocolatey with a raw, earthy tenacity.',
    price: 9,
    image: img('patchouli'),
    // Fragrantica: patchouli = dark earthy brown-green
    color: '#5A4820',
    attributes: {
      freshness: 2,
      sweetness: 2,
      warmth: 6,
      intensity: 8,
      longevity: 9,
      projection: 7,
      polarizing: 7,
    },
    occasions: ['evening'],
    seasons: ['autumn', 'winter'],
  },
  // Amber / resin bases
  {
    id: 'amber',
    name: 'Golden Amber',
    layer: 'base',
    family: 'amber',
    description: 'Warm resinous glow with honeyed labdanum and cistus warmth.',
    price: 13,
    image: img('amber'),
    // Fragrantica: amber = rich deep golden-orange
    color: '#D07818',
    attributes: {
      freshness: 1,
      sweetness: 6,
      warmth: 9,
      intensity: 7,
      longevity: 9,
      projection: 7,
      polarizing: 3,
    },
    occasions: ['evening', 'special'],
    seasons: ['winter', 'autumn'],
  },
  {
    id: 'labdanum',
    name: 'Labdanum',
    layer: 'base',
    family: 'amber',
    description:
      'Dark resinous cistus — the heart of oriental amber. Deep, animalic, ancient.',
    price: 16,
    image: img('amber'),
    // Fragrantica: labdanum = deep warm amber-brown
    color: '#A05020',
    attributes: {
      freshness: 0,
      sweetness: 4,
      warmth: 10,
      intensity: 8,
      longevity: 10,
      projection: 8,
      polarizing: 6,
    },
    occasions: ['evening', 'special'],
    seasons: ['winter'],
  },
  {
    id: 'frankincense',
    name: 'Frankincense',
    layer: 'base',
    family: 'amber',
    description:
      'Sacred resin — incense-like, slightly lemony, meditative and complex.',
    price: 17,
    image: img('amber'),
    // Fragrantica: frankincense = pale smoky grey-amber
    color: '#C0A860',
    attributes: {
      freshness: 3,
      sweetness: 2,
      warmth: 7,
      intensity: 7,
      longevity: 9,
      projection: 7,
      polarizing: 5,
    },
    occasions: ['evening', 'special'],
    seasons: ['winter', 'autumn'],
  },
  // Fresh / musk bases
  {
    id: 'musk',
    name: 'White Musk',
    layer: 'base',
    family: 'fresh',
    description: 'Soft, clean and skin-like. A quiet intimate second skin.',
    price: 8,
    image: img('amber'),
    // Fragrantica: white musk = very pale grey-lilac
    color: '#C8B8C8',
    attributes: {
      freshness: 5,
      sweetness: 4,
      warmth: 4,
      intensity: 3,
      longevity: 8,
      projection: 4,
      polarizing: 1,
    },
    occasions: ['day', 'office', 'date'],
    seasons: ['spring', 'summer', 'autumn', 'winter'],
  },
  {
    id: 'ambroxan',
    name: 'Ambroxan',
    layer: 'base',
    family: 'fresh',
    description:
      'Ambergris-derived synthetic — clean, skin-close, radiantly warm and magnetic.',
    price: 19,
    image: img('aquatic'),
    // Fragrantica: ambroxan = clear pale sea-grey
    color: '#A8C0C8',
    attributes: {
      freshness: 4,
      sweetness: 2,
      warmth: 5,
      intensity: 6,
      longevity: 10,
      projection: 8,
      polarizing: 4,
    },
    occasions: ['day', 'evening', 'date'],
    seasons: ['spring', 'summer', 'autumn', 'winter'],
  },
]

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
