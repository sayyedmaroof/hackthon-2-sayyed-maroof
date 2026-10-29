import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import { DATABASE_URL } from '../lib/app-config'

export const SESSION_COOKIE = 'sb_session'

// Cache the connection across dev hot reloads and serverless invocations.
// The connection string is app-configured (lib/app-config.ts), not env-based.
function getDatabaseUrl(): string {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured. Set it in lib/app-config.ts.')
  }
  return DATABASE_URL
}

function createSql() {
  return postgres(getDatabaseUrl(), { max: 5, prepare: false })
}

const globalForDb = globalThis as unknown as { __scentbuildSql?: postgres.Sql }

export const sql: postgres.Sql =
  globalForDb.__scentbuildSql ?? (globalForDb.__scentbuildSql = createSql())

export const db = drizzle(sql, { schema })

export type Database = typeof db
