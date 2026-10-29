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
  return postgres(getDatabaseUrl(), { max: 5, prepare: false })
}

const globalForDb = globalThis as unknown as { __scentbuildSql?: postgres.Sql }

export const sql: postgres.Sql =
  globalForDb.__scentbuildSql ?? (globalForDb.__scentbuildSql = createSql())

export const db = drizzle(sql, { schema })

export type Database = typeof db
