import fs from 'node:fs'
import Stripe from 'stripe'

const env = fs.readFileSync('.env.local', 'utf8')
function get(key) {
  const line = env.split('\n').find((row) => row.startsWith(`${key}=`))
  if (!line) return ''
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '')
}

const stripe = new Stripe(get('STRIPE_SECRET_KEY'))
const hooks = await stripe.webhookEndpoints.list({ limit: 20 })
console.log(
  hooks.data.map((hook) => ({
    url: hook.url,
    status: hook.status,
    enabled_events: hook.enabled_events,
    api_version: hook.api_version,
  })),
)
