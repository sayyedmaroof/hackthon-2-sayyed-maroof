'use client'

import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { Menu, ShoppingBag, User, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandLogo } from '@/components/brand-logo'
import { useAuth } from '@/lib/auth-store'
import { useStudio } from '@/lib/studio-store'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/explore', label: 'Explore' },
  { href: '/concierge', label: 'Concierge' },
  { href: '/account', label: 'My Blends' },
]

const mobileMenuVariants: Variants = {
  hidden: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
  show: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  },
}

const mobileItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
}

const logoSwapVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
  },
  exit: { opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.16 } },
}

export function SiteHeader() {
  const pathname = usePathname()
  const { cartCount, hydrated } = useStudio()
  const { user, status, openPrompt } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Track scroll for header expansion/collapse behavior
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 64)
    window.addEventListener('scroll', handleScroll, { passive: true })
    // Initialize on mount
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-50 border-b border-[#CCDFF0]/60 bg-[#F5F9FD]/95 shadow-[0_2px_16px_rgba(14,27,51,0.06)] backdrop-blur transition-all duration-300 supports-[backdrop-filter]:bg-[#F5F9FD]/90">
      <div
        className={cn(
          'mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 transition-all duration-300 sm:px-6 lg:px-8',
          scrolled ? 'h-16' : 'h-24 md:h-32',
        )}
      >
        {/* Logo — full lockup at the top of a page, bottle-only once scrolled */}
        <Link
          href="/"
          className="flex items-center self-center focus-visible:outline-none"
          onClick={() => setOpen(false)}
        >
          <AnimatePresence mode="wait" initial={false}>
            {scrolled ? (
              <motion.span
                key="logo-compact"
                initial="hidden"
                animate="show"
                exit="exit"
                variants={logoSwapVariants}
                className="block"
              >
                <BrandLogo compact />
              </motion.span>
            ) : (
              <motion.span
                key="logo-full"
                initial="hidden"
                animate="show"
                exit="exit"
                variants={logoSwapVariants}
                className="block"
              >
                <BrandLogo large />
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative text-sm tracking-[0.1em] uppercase transition-colors duration-200',
                      active
                        ? 'text-[#0A1A52]'
                        : 'text-[#0E1B33]/60 hover:text-[#0A1A52]',
                    )}
                  >
                    {item.label}
                    {/* Animated underline */}
                    <span
                      className={cn(
                        'absolute -bottom-0.5 left-0 h-px bg-[#1E63C8] transition-all duration-300',
                        active ? 'w-full' : 'w-0 group-hover:w-full',
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
          {/* Account: sign-in button for guests, name chip for members */}
          {status === 'authed' && user ? (
            <Link
              href="/account"
              title="My account"
              aria-label={`Account: ${user.name}`}
              className={cn(
                'relative inline-flex size-10 items-center justify-center rounded-full bg-[#1E63C8]/10 text-sm font-semibold text-[#0A1A52] transition-colors hover:bg-[#1E63C8]/20',
              )}
            >
              <User className="size-5" aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openPrompt('login')}
              className="inline-flex size-10 items-center justify-center rounded-full text-[#0E1B33]/70 transition-colors hover:bg-[#154FB8]/8 hover:text-[#0A1A52]"
              aria-label="Sign in"
            >
              <User className="size-5" aria-hidden="true" />
            </button>
          )}

          {/* Cart */}
          <Link
            href="/cart"
            className="relative inline-flex size-10 items-center justify-center rounded-full text-[#0E1B33]/70 transition-colors hover:bg-[#154FB8]/8 hover:text-[#0A1A52]"
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
                  className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-[#1E63C8] px-1 text-[0.6rem] font-semibold text-[#F5F9FD]"
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
              className="btn-shine rounded-full bg-[#1E63C8] px-5 py-2.5 text-sm font-medium text-[#F5F9FD] shadow-[0_6px_20px_rgba(30,99,200,0.25)] transition-colors hover:bg-[#154FB8]"
            >
              Create Your Scent
            </Link>
          </motion.div>

          {/* Mobile burger */}
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-[#0E1B33]/70 transition-colors hover:bg-[#154FB8]/8 hover:text-[#0A1A52] md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(v => !v)}
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
            className="overflow-hidden border-t border-[#CCDFF0]/60 bg-[#F5F9FD] md:hidden"
          >
            <motion.ul
              className="flex flex-col px-4 py-3"
              initial="hidden"
              animate="show"
              variants={{
                show: {
                  transition: { staggerChildren: 0.06, delayChildren: 0.05 },
                },
              }}
            >
              {[...NAV, { href: '/cart', label: 'Cart' }].map(item => (
                <motion.li key={item.href} variants={mobileItemVariants}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={
                      pathname.startsWith(item.href) ? 'page' : undefined
                    }
                    className={cn(
                      'block rounded-lg px-3 py-3.5 text-sm font-medium uppercase tracking-[0.12em] transition-colors',
                      pathname.startsWith(item.href)
                        ? 'text-[#0A1A52]'
                        : 'text-[#0E1B33]/70 hover:bg-[#154FB8]/5 hover:text-[#0A1A52]',
                    )}
                  >
                    {item.label}
                  </Link>
                </motion.li>
              ))}
              {/* Mobile auth */}
              <motion.li variants={mobileItemVariants}>
                {status === 'authed' && user ? (
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3.5 text-sm font-medium uppercase tracking-[0.12em] text-[#0E1B33]/70 transition-colors hover:bg-[#154FB8]/5 hover:text-[#0A1A52]"
                  >
                    {user.name.split(' ')[0]} · Account
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      openPrompt('login')
                    }}
                    className="block w-full rounded-lg px-3 py-3.5 text-left text-sm font-medium uppercase tracking-[0.12em] text-[#0E1B33]/70 transition-colors hover:bg-[#154FB8]/5 hover:text-[#0A1A52]"
                  >
                    Sign in / Sign up
                  </button>
                )}
              </motion.li>
              {/* Mobile CTA */}
              <motion.li variants={mobileItemVariants} className="mt-2 pb-2">
                <Link
                  href="/builder"
                  onClick={() => setOpen(false)}
                  className="block rounded-full bg-[#1E63C8] px-5 py-3 text-center btn-shine text-sm font-medium text-[#F5F9FD]"
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
