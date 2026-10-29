import { createWebhookProcessor, createDrizzleStripeEventStore } from '@/lib/payments/webhooks'
import { db } from '@/db'
import { getWebhookSecret, requireWebhookSecret } from '@/lib/stripe'
import Stripe from 'stripe'

/**
 * Stripe webhook endpoint.
 *
 * Deployed destination (sandbox): /api/webhooks/stripe on the app origin.
 * Also forwards from `stripe listen` locally — the CLI prints its own
 * `whsec_...` which must be placed in STRIPE_WEBHOOK_SECRET locally WITHOUT
 * touching the deployed endpoint's secret in Vercel.
 *
 * Runtime constraints honoured here:
 * - POST only; other methods fall through Next's 405 handling (no export).
 * - The raw body is read via request.text() and passed to
 *   Stripe.webhooks.constructEvent() unchanged — never parse/reserialize
 *   before verifying the signature.
 * - Missing/invalid signatures → 400, always; no unsigned payment events.
 * - 2xx only for processed, deduplicated, or deliberately ignored events;
 *   transient DB problems answer retryable so Stripe redelivers.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // ── Configuration ──────────────────────────────────────────────────────
  if (!getWebhookSecret()) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return new Response('Webhook secret is not configured.', { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header.', { status: 400 })
  }

  // ── Raw body + signature verification (never parse first) ─────────────
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return new Response('Could not read request body.', { status: 400 })
  }

  // Webhook verification is static and needs only the signing secret —
  // STRIPE_SECRET_KEY is not required (and never used) here.
  let event: Stripe.Event
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, requireWebhookSecret())
  } catch (error) {
    console.error(
      '[stripe-webhook] signature verification failed:',
      error instanceof Error ? error.message : error,
    )
    return new Response('Invalid signature.', { status: 400 })
  }

  // ── Transactional, idempotent processing ───────────────────────────────
  const processStripeEvent = createWebhookProcessor(createDrizzleStripeEventStore(db))
  const result = await processStripeEvent(event)

  switch (result.outcome) {
    case 'processed':
    case 'duplicate':
    case 'ignored':
      return new Response('Received', { status: 200 })
    case 'retryable':
      // Transient failure: tell Stripe to redeliver. The event was rolled
      // back, so the retry starts from a clean slate.
      console.error(`[stripe-webhook] retryable failure for event ${event.id}: ${result.reason}`)
      return new Response('Transient failure — retry.', { status: 500 })
  }
}
