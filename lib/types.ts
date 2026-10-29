export type Layer = 'top' | 'middle' | 'base'

export type Family =
  | 'citrus'
  | 'fresh'
  | 'floral'
  | 'woody'
  | 'amber'
  | 'spicy'
  | 'gourmand'

export type Occasion = 'day' | 'office' | 'evening' | 'date' | 'special'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export interface ScentAttributes {
  freshness: number
  sweetness: number
  warmth: number
  intensity: number
  longevity: number
  projection: number
  polarizing: number
}

export interface FragranceNote {
  id: string
  name: string
  layer: Layer
  family: Family
  description: string
  price: number
  image: string
  color: string
  attributes: ScentAttributes
  occasions: Occasion[]
  seasons: Season[]
}

export interface BlendNote {
  noteId: string
  layer: Layer
}

export interface ClashRule {
  id: string
  notes: [string, string]
  reason: string
  /** Suggested replacements keyed by the note the user is trying to add. */
  alternatives: Record<string, string[]>
}

export type BottleSize = 30 | 50 | 100
export type Concentration = 'edt' | 'edp' | 'parfum'
export type BottleType = 'classic' | 'designer'
export type AtomizerMaterial = 'plastic' | 'metal'
export type AtomizerType = 'normal' | 'pressurized'
export type LabelStyle = 'ivory' | 'noir' | 'copper'
/** Formulation vehicle the fragrance oils are carried in. */
export type Base = 'alcohol' | 'water'

export interface BottleOptions {
  size: BottleSize
  concentration: Concentration
  bottleType: BottleType
  atomizerMaterial: AtomizerMaterial
  atomizerType: AtomizerType
  labelStyle: LabelStyle
  base: Base
}

export interface Blend {
  id: string
  name: string
  noteIds: string[]
  bottle: BottleOptions
  presetId?: string
  updatedAt: number
}

export interface FragrancePreset {
  id: string
  name: string
  tagline: string
  description: string
  families: Family[]
  image: string
  noteIds: string[]
  occasions: Occasion[]
  seasons: Season[]
  featured: boolean
  popular: boolean
  inspiredBy?: string
  bottle: BottleOptions
}

export interface ScentProfile {
  family: Family
  familyMix: { family: Family; share: number }[]
  freshness: number
  sweetness: number
  warmth: number
  intensity: number
  longevity: number
  projection: number
  crowdAppeal: number
  polarizing: number
  character: 'Safe' | 'Balanced' | 'Bold'
  occasions: Occasion[]
  seasons: Season[]
  timeOfDay: string
  genderLean: string
  ageRange: string
  color: string
  /** Shares of presence weight per layer (realistic pyramid proportion). */
  pyramid: { top: number; middle: number; base: number }
  /** How the blend unfolds on skin, calibrated to realistic wear timings. */
  evolution: ProfilePhase[]
  /** Names of fixative base materials anchoring the drydown. */
  fixativeNames: string[]
}

export interface ProfilePhase {
  phase: 'Opening' | 'Heart' | 'Drydown'
  /** Realistic window on skin, e.g. '15 min – 3 h'. */
  window: string
  description: string
}

export type BlendWarningType = 'structure' | 'balance' | 'performance' | 'safety' | 'coherence'

/** Advisory note from the formula-review engine (non-blocking). */
export interface BlendWarning {
  id: string
  type: BlendWarningType
  message: string
  suggestion?: string
}

export interface PriceBreakdown {
  notesSubtotal: number
  bottleCost: number
  adjustment: number
  unitTotal: number
  lines: { label: string; amount: number }[]
}

export interface CartItem {
  id: string
  blend: Blend
  quantity: number
}

export interface OrderLine {
  blend: Blend
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Order {
  id: string
  reference: string
  email: string
  fullName: string
  lines: OrderLine[]
  subtotal: number
  shipping: number
  total: number
  createdAt: number
  mode: 'demo'
}

export type RecommendationTier = 'Safe' | 'Balanced' | 'Bold'

export interface ConciergeRecommendation {
  tier: RecommendationTier
  name: string
  noteIds: string[]
  family: Family
  summary: string
  explanation: string
  profile: ScentProfile
}

export interface ConciergeInput {
  mood?: string
  occasion?: string
  families: Family[]
  intensity?: 'subtle' | 'moderate' | 'bold'
  avoid: string[]
  freeText: string
}
