import { ConciergeIntro } from '@/components/landing/concierge-intro'
import { FeaturedBlends } from '@/components/landing/featured-blends'
import { FinalCta } from '@/components/landing/final-cta'
import { Hero } from '@/components/landing/hero'
import { LayersExplainer } from '@/components/landing/layers-explainer'
import { ProcessSteps } from '@/components/landing/process-steps'
import { StudioPreview } from '@/components/landing/studio-preview'

export default function HomePage() {
  return (
    <>
      {/* 1. Hero — cinematic entrance */}
      <Hero />
      {/* 2. How it works — process steps */}
      <ProcessSteps />
      {/* 3. House compositions — featured blends */}
      <FeaturedBlends />
      {/* 4. Fragrance pyramid — layers explainer */}
      <LayersExplainer />
      {/* 5. Interactive builder preview */}
      <StudioPreview />
      {/* 6. AI Concierge */}
      <ConciergeIntro />
      {/* 7. Final CTA */}
      <FinalCta />
    </>
  )
}
