import Stripe from 'stripe'

/**
 * Server-only Stripe configuration.
 *
 * Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) must never be imported
 * from client code. This module validates configuration lazily — payment or
 * webhook operations call `requireStripe`/`requireWebhookSecret`, so a missing
 * key produces a single clear server-side error instead of crashing at import.
 *
 * Redirect URLs are always built from the validated `NEXT_PUBLIC_APP_URL`
 * origin — never from arbitrary `Host` or forwarded-host request headers.
 */

export class StripeConfigError extends Error {}

export interface StripeConfig {
  secretKey: string
  appUrl: string
}

/**
 * Reads the configured app URL lazily so that env changes (or serverless
 * cold-start env validation) are always honored at call time.
 */
function readPrimaryAppUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Validates that an app URL is an absolute http(s) origin without a path. */
export function validateAppUrl(
  raw: string | undefined | null,
): { url: string; origin: string } | { error: string } {
  if (!raw || (typeof raw === 'string' && raw.trim().length === 0)) {
    return { error: 'NEXT_PUBLIC_APP_URL is not configured.' }
  }
  let parsed: URL
  try {
    parsed = new URL(raw.trim())
  } catch {
    return { error: 'NEXT_PUBLIC_APP_URL is not a valid absolute URL.' }
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { error: 'NEXT_PUBLIC_APP_URL must use http or https.' }
  }
  if (parsed.pathname !== '/' && parsed.pathname.length > 0) {
    return { error: 'NEXT_PUBLIC_APP_URL must be an origin without a path.' }
  }
  if (parsed.username || parsed.password) {
    return { error: 'NEXT_PUBLIC_APP_URL must not contain credentials.' }
  }
  return { url: raw.trim().replace(/\/$/, ''), origin: parsed.origin }
}

/**
 * Full configuration check for checkout creation. Returns `null` when Stripe
 * is not configured; the caller must answer with a safe client-facing error.
 */
export function getStripeConfig(): StripeConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey || secretKey.length < 8) return null

  const appUrl = validateAppUrl(readPrimaryAppUrl())
  if ('error' in appUrl) return null

  return { secretKey, appUrl: appUrl.url }
}

let stripeSingleton: Stripe | null = null

function createClient(secretKey: string): Stripe {
  if (stripeSingleton) return stripeSingleton
  const client = new Stripe(secretKey, { typescript: true })
  stripeSingleton = client
  return client
}

/**
 * Returns a Stripe client using the server secret key, or `null` when Stripe
 * is not configured. Never expose the client (or key) client-side.
 */
export function getStripe(): Stripe | null {
  const config = getStripeConfig()
  if (!config) return null
  return createClient(config.secretKey)
}

/** Checked variant that throws a typed, secret-free error message. */
export function requireStripe(): Stripe {
  const client = getStripe()
  if (!client) {
    throw new StripeConfigError(
      'Stripe is not configured. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_APP_URL.',
    )
  }
  return client
}

/**
 * The webhook signing secret for the *current* deployment. The Stripe CLI
 * prints a separate local `whsec_...` for `stripe listen`; that value belongs
 * in this same env var while testing locally and must not overwrite the
 * deployed endpoint's secret.
 */
export function getWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  return secret && secret.length >= 8 ? secret : null
}

export function requireWebhookSecret(): string {
  const secret = getWebhookSecret()
  if (!secret) {
    throw new StripeConfigError('Stripe webhook secret is not configured (STRIPE_WEBHOOK_SECRET).')
  }
  return secret
}

/**
 * Builds a trusted absolute URL from the validated app origin, e.g.
 * `appUrl('/checkout?canceled=1')` → `{APP_URL}/checkout?canceled=1`.
 * Path must start with "/"; it is never taken from request headers.
 */
export function appUrl(path: string): string {
  const config = getStripeConfig()
  if (!config) {
    throw new StripeConfigError(
      'Stripe app URL is not configured. Set NEXT_PUBLIC_APP_URL to the deployed origin.',
    )
  }
  if (!path.startsWith('/')) {
    throw new StripeConfigError('appUrl() expects an absolute path starting with "/".')
  }
  return `${config.appUrl}${path}`
}

export function isStripeConfigured(): boolean {
  return getStripeConfig() !== null
}

// --
// Order reference + status helpers shared by checkout/webhook flows.

/** Human-readable, collision-resistant order reference: `SB-XXXXXXXXXX`. */
export function generateOrderReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)]
  return `SB-${Array.from({ length: 10 }, pick).join('')}`
}

/**
 * Checkout-attempt identifiers come from the client (one per intentional
 * submission). Accept only well-formed values so they can be a safe DB key.
 */
export function isValidCheckoutAttemptId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value)
}

/** Guard for Stripe session IDs accepted via query strings. */
export function isValidStripeSessionId(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('cs_') && value.length >= 16 && value.length <= 400
}
