import { cn } from '@/lib/utils'

/**
 * Minimal pulsing placeholder used by route-level `loading.tsx` fallbacks and
 * in-page skeletons so every "loading" surface looks consistent.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-2xl bg-frost', className)}
    />
  )
}
