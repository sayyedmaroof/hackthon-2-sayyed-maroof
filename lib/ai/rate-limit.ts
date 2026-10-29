/**
 * rate-limit.ts — Process-local sliding-window limiter for the AI endpoint.
 *
 * Adequate for a single serverless instance / local dev. IMPORTANT: with
 * multiple serverless instances each keeps its own window, so the effective
 * limit scales with instance count. Swap in a shared store (e.g. an existing
 * Redis/Upstash deployment) if strict global limits become necessary.
 */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

const MAX_ENTRIES = 10_000

const windows = new Map<string, number[]>()

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const timestamps = (windows.get(key) ?? []).filter((t) => now - t < windowMs)

  if (timestamps.length >= limit) {
    const oldest = timestamps[0]
    windows.set(key, timestamps)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    }
  }

  timestamps.push(now)
  windows.set(key, timestamps)

  if (windows.size > MAX_ENTRIES) {
    // Cheap eviction: drop everything older than the window.
    for (const [k, ts] of windows) {
      const alive = ts.filter((t) => now - t < windowMs)
      if (alive.length === 0) windows.delete(k)
      else windows.set(k, alive)
    }
  }

  return { allowed: true, remaining: limit - timestamps.length, retryAfterSeconds: 0 }
}

/** Test hook: clear all windows. */
export function resetRateLimits(): void {
  windows.clear()
}
