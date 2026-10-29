import net from 'node:net'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

export const SESSION_COOKIE = 'sb_session'

// Cache the connection across dev hot reloads and serverless invocations.
function getDatabaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add it to .env.local.')
  }
  return process.env.DATABASE_URL
}

function createSql() {
  const connectionString = getDatabaseUrl()
  const url = new URL(connectionString)
  const port = url.port ? Number(url.port) : 5432

  // Neon (and some networks) resolve to IPv6 addresses that are unreachable
  // locally while IPv4 works. postgres.js may race multiple targets and fail
  // with ETIMEDOUT / ENETUNREACH unless we pin the socket to IPv4.
  const forceIpv4 =
    url.hostname.includes('.neon.tech') || process.env.PG_FORCE_IPV4 === '1'

  return postgres(connectionString, {
    max: 5,
    prepare: false,
    ...(forceIpv4
      ? {
          socket: () => {
            const socket = net.connect({ host: url.hostname, port, family: 4 })
            socket.host = url.hostname
            socket.port = port
            return socket
          },
        }
      : {}),
  })
}

const globalForDb = globalThis as unknown as { __scentbuildSql?: postgres.Sql }

export const sql: postgres.Sql =
  globalForDb.__scentbuildSql ?? (globalForDb.__scentbuildSql = createSql())

export const db = drizzle(sql, { schema })

export type Database = typeof db
