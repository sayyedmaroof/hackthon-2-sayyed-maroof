import fs from 'node:fs'
import net from 'node:net'
import postgres from 'postgres'

const env = fs.readFileSync('.env.local', 'utf8')
function get(key) {
  const line = env.split('\n').find((row) => row.startsWith(`${key}=`))
  if (!line) return ''
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '')
}

const raw = get('DATABASE_URL')
const stripped = new URL(raw)
stripped.searchParams.delete('channel_binding')
const host = stripped.hostname

function ipv4Socket() {
  const socket = net.connect({ host, port: 5432, family: 4 })
  socket.host = host
  socket.port = 5432
  return socket
}

async function tryConnect(label, connectionString) {
  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
    connect_timeout: 20,
    socket: ipv4Socket,
  })
  const started = Date.now()
  try {
    const rows = await sql`select current_database() as db`
    console.log(label, 'ok', rows[0], 'ms', Date.now() - started)
  } catch (error) {
    const nested = Array.isArray(error?.errors) ? error.errors.map((item) => item.message).slice(0, 4) : []
    console.log(label, 'fail', 'ms', Date.now() - started, error.code, String(error.message || error).slice(0, 400), nested)
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {})
  }
}

await tryConnect('ipv4_as_is', raw)
await tryConnect('ipv4_no_channel', stripped.toString())
