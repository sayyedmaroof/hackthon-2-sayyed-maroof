/**
 * Local webhook simulator: signs an event with STRIPE_WEBHOOK_SECRET (same
 * value the local endpoint verifies against) and POSTs it to /api/webhooks/stripe.
 * Usage: node scripts-webhook-sim.mjs <eventType> <sessionId> <paymentStatus> [paymentIntent]
 */
import postgres from 'postgres'
import Stripe from 'stripe'

const [eventType, sessionId, paymentStatus, paymentIntent] = process.argv.slice(2)
const url = process.env.DATABASE_URL
const secret = process.env.STRIPE_WEBHOOK_SECRET

const sql = postgres(url, { max: 1 })
const order = (await sql`select id, reference, status from orders where stripe_session_id = ${sessionId} limit 1`)[0]
if (!order) {
  console.error('no order with that session id')
  process.exit(1)
}

const event = {
  id: `evt_${eventType}_${Date.now()}`,
  object: 'event',
  type: eventType,
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  api_version: '2026-01-01.clover',
  data: {
    object: {
      id: sessionId,
      object: 'checkout.session',
      payment_status: paymentStatus ?? 'paid',
      status: 'complete',
      metadata: { orderId: order.id, orderRef: order.reference },
      payment_intent: paymentIntent ?? 'pi_local_sim_1',
    },
  },
}

const header = Stripe.webhooks.generateTestHeaderString({
  payload: JSON.stringify(event),
  secret: process.env.STRIPE_WEBHOOK_SECRET,
})

const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'stripe-signature': header },
  body: JSON.stringify(event),
})
console.log(`${eventType} (${paymentStatus}) => HTTP ${response.status}`)

const after = (await sql`select id, reference, status, stripe_payment_intent_id, paid_at from orders where id = ${order.id} limit 1`)[0]
console.log('order after:', JSON.stringify(after))
await sql.end()
