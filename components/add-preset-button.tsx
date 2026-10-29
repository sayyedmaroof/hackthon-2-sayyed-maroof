'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-store'
import { createId } from '@/lib/storage'
import { useStudio } from '@/lib/studio-store'
import type { FragrancePreset } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Quick "add to cart" for preset blends (explore cards).
 * Adds the preset directly to the cart without touching the builder draft:
 * guests are routed through the sign-up prompt first, matching the builder flow.
 */
export function AddPresetButton({
  preset,
  dark = false,
  className,
}: {
  preset: FragrancePreset
  dark?: boolean
  className?: string
}) {
  const { addToCart } = useStudio()
  const { requireAuth } = useAuth()
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    requireAuth(() => {
      addToCart({
        id: createId('blend'),
        name: preset.name,
        noteIds: [...preset.noteIds],
        bottle: { ...preset.bottle },
        presetId: preset.id,
        updatedAt: Date.now(),
      })
      toast.success(`${preset.name} added to cart.`, {
        action: { label: 'View cart', onClick: () => { window.location.href = '/cart' } },
      })
      setAdded(true)
      window.setTimeout(() => setAdded(false), 1600)
    })
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={`Add ${preset.name} to cart`}
      title={`Add ${preset.name} to cart`}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors',
        added
          ? 'border border-[#1E63C8] bg-[#1E63C8] text-[#F5F9FD]'
          : dark
            ? 'border border-[#F5F9FD]/12 text-[#F5F9FD]/70 hover:bg-[#F5F9FD]/8 hover:text-[#F5F9FD]'
            : 'border border-[#CCDFF0] bg-white text-[#0E1B33] hover:border-[#1E63C8] hover:bg-[#F5F9FD] hover:text-[#1E63C8]',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {added ? (
          <motion.span
            key="added"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 480, damping: 24 }}
          >
            <Check className="size-5" aria-hidden="true" />
          </motion.span>
        ) : (
          <motion.span
            key="bag"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 480, damping: 24 }}
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
