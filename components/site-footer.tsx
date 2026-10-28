import Link from 'next/link'
import { BrandLogo } from '@/components/brand-logo'

export function SiteFooter() {
  return (
    <footer className="bg-[#24101F] text-[#FAF7F0]/70">
      {/* Separator shimmer */}
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-[#B88A3B]/30 to-transparent" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <BrandLogo light className="max-w-[220px]" />
          <p className="mt-4 text-sm leading-relaxed text-[#FAF7F0]/55">
            Your custom fragrance atelier. Compose, preview and order a blend that is unmistakably yours.
          </p>
        </div>

        <nav aria-label="Studio">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-[#D4B16A]">Studio</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link
                className="transition-colors hover:text-[#D4B16A]"
                href="/builder"
              >
                Fragrance builder
              </Link>
            </li>
            <li>
              <Link
                className="transition-colors hover:text-[#D4B16A]"
                href="/explore"
              >
                Explore blends
              </Link>
            </li>
            <li>
              <Link
                className="transition-colors hover:text-[#D4B16A]"
                href="/concierge"
              >
                Scent concierge
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Account">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-[#D4B16A]">Account</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link
                className="transition-colors hover:text-[#D4B16A]"
                href="/account"
              >
                My blends
              </Link>
            </li>
            <li>
              <Link
                className="transition-colors hover:text-[#D4B16A]"
                href="/cart"
              >
                Cart
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-[#FAF7F0]/8">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-[#FAF7F0]/35 sm:px-6 lg:px-8">
          Demo storefront. Checkout is simulated and no payment is taken. Blend compatibility rules reflect ScentBuild house style.
        </p>
      </div>
    </footer>
  )
}
