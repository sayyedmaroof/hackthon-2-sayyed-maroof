'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Menu, ShoppingBag, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandLogo } from '@/components/brand-logo'
import { useStudio } from '@/lib/studio-store'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/explore',   label: 'Explore' },
  { href: '/builder',   label: 'Builder' },
  { href: '/concierge', label: 'Concierge' },
  { href: '/account',   label: 'My Blends' },
]

const mobileMenuVariants = {
  hidden: { opacity: 0, height: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
  show:   { opacity: 1, height: 'auto', transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
}

const mobileItemVariants = {
  hidden: { opacity: 0, x: -10 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
}

export function SiteHeader() {
  const pathname = usePathname()
  const { cartCount, hydrated } = useStudio()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Track scroll for header background transition
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 64)
    window.addEventListener('scroll', handleScroll, { passive: true })
    // Initialize on mount
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [pathname])

  const isHome = pathname === '/'

  // When on home and not scrolled: dark background hero shows through → use light text
  // When scrolled or on another page: use ivory background + dark text
  const isLightMode = !isHome || scrolled

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        isLightMode
          ? 'border-b border-[#E5D8C4]/60 bg-[#FAF7F0]/95 shadow-[0_2px_16px_rgba(48,36,31,0.07)] backdrop-blur supports-[backdrop-filter]:bg-[#FAF7F0]/90'
          : 'border-b border-[#FAF7F0]/8 bg-[#24101F]/90 backdrop-blur',
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center self-center focus-visible:outline-none"
          onClick={() => setOpen(false)}
        >
          <span className="hidden sm:flex">
            {isLightMode ? (
              <BrandLogo className="max-w-[240px]" />
            ) : (
              <BrandLogo light className="max-w-[240px]" />
            )}
          </span>
          <span className="sm:hidden">
            <BrandLogo compact />
          </span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative text-sm tracking-[0.1em] uppercase transition-colors duration-200',
                      isLightMode
                        ? active
                          ? 'text-[#351329]'
                          : 'text-[#30241F]/60 hover:text-[#351329]'
                        : active
                          ? 'text-[#D4B16A]'
                          : 'text-[#FAF7F0]/65 hover:text-[#FAF7F0]',
                    )}
                  >
                    {item.label}
                    {/* Animated underline */}
                    <span
                      className={cn(
                        'absolute -bottom-0.5 left-0 h-px transition-all duration-300',
                        active ? 'w-full' : 'w-0 group-hover:w-full',
                        isLightMode ? 'bg-[#B88A3B]' : 'bg-[#D4B16A]',
                      )}
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Cart */}
          <Link
            href="/cart"
            className={cn(
              'relative inline-flex size-10 items-center justify-center rounded-full transition-colors',
              isLightMode
                ? 'text-[#30241F]/70 hover:bg-[#351329]/8 hover:text-[#351329]'
                : 'text-[#FAF7F0]/65 hover:bg-[#FAF7F0]/10 hover:text-[#FAF7F0]',
            )}
            aria-label={`Cart, ${hydrated ? cartCount : 0} items`}
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            <AnimatePresence>
              {hydrated && cartCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                  className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-[#B88A3B] px-1 text-[0.6rem] font-semibold text-[#FAF7F0]"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {/* CTA pill */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="hidden sm:block"
          >
            <Link
              href="/builder"
              className={cn(
                'rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
                isLightMode
                  ? 'bg-[#351329] text-[#FAF7F0] hover:bg-[#B88A3B]'
                  : 'bg-[#B88A3B] text-[#FAF7F0] hover:bg-[#D4B16A]',
              )}
            >
              Create Your Scent
            </Link>
          </motion.div>

          {/* Mobile burger */}
          <button
            type="button"
            className={cn(
              'inline-flex size-10 items-center justify-center rounded-full transition-colors md:hidden',
              isLightMode
                ? 'text-[#30241F]/70 hover:bg-[#351329]/8 hover:text-[#351329]'
                : 'text-[#FAF7F0]/65 hover:bg-[#FAF7F0]/10 hover:text-[#FAF7F0]',
            )}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="x"
                  initial={{ rotate: -45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 45, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <X className="size-5" aria-hidden="true" />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ rotate: 45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -45, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Menu className="size-5" aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            key="mobile-nav"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={mobileMenuVariants}
            aria-label="Mobile"
            className={cn(
              'overflow-hidden border-t md:hidden',
              isLightMode
                ? 'border-[#E5D8C4]/60 bg-[#FAF7F0]'
                : 'border-[#FAF7F0]/8 bg-[#24101F]',
            )}
          >
            <motion.ul
              className="flex flex-col px-4 py-3"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
            >
              {[...NAV, { href: '/cart', label: 'Cart' }].map((item) => (
                <motion.li key={item.href} variants={mobileItemVariants}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                    className={cn(
                      'block rounded-lg px-3 py-3.5 text-sm font-medium uppercase tracking-[0.12em] transition-colors',
                      isLightMode
                        ? pathname.startsWith(item.href)
                          ? 'text-[#351329]'
                          : 'text-[#30241F]/70 hover:bg-[#351329]/5 hover:text-[#351329]'
                        : pathname.startsWith(item.href)
                          ? 'text-[#D4B16A]'
                          : 'text-[#FAF7F0]/65 hover:bg-[#FAF7F0]/8 hover:text-[#FAF7F0]',
                    )}
                  >
                    {item.label}
                  </Link>
                </motion.li>
              ))}
              {/* Mobile CTA */}
              <motion.li variants={mobileItemVariants} className="mt-2 pb-2">
                <Link
                  href="/builder"
                  onClick={() => setOpen(false)}
                  className="block rounded-full bg-[#B88A3B] px-5 py-3 text-center text-sm font-medium text-[#FAF7F0]"
                >
                  Create Your Scent
                </Link>
              </motion.li>
            </motion.ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
