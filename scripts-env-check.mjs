import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
function get(key) {
  const line = env.split('\n').find((row) => row.startsWith(`${key}=`))
  if (!line) return ''
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '')
}

const db = get('DATABASE_URL')
let host = ''
let port = ''
let protocol = ''
let user = ''
try {
  const u = new URL(db)
  host = u.hostname
  port = u.port
  protocol = u.protocol
  user = u.username
} catch {
  host = 'unparseable'
}

const stripe = get('STRIPE_SECRET_KEY')
const app = get('NEXT_PUBLIC_APP_URL')
const wh = get('STRIPE_WEBHOOK_SECRET')

console.log('keys', env.split('\n').map((row) => row.split('=')[0]).filter((key) => key && !key.startsWith('#')))
console.log(
  JSON.stringify(
    {
      dbHost: host,
      dbPort: port || '(default)',
      dbProtocol: protocol,
      dbUser: user,
      dbHasPassword: db.includes('@') && db.split('@')[0].includes(':'),
      dbQuery: (() => {
        try {
          return new URL(db).search
        } catch {
          return ''
        }
      })(),
      stripePrefix: stripe.slice(0, 8),
      stripeLen: stripe.length,
      appUrl: app,
      webhookPrefix: wh.slice(0, 6),
      webhookLen: wh.length,
    },
    null,
    2,
  ),
)
