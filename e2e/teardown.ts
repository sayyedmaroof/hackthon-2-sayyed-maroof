import { like } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

// Cleans up the demo database after the E2E run: removes only the
// "e2e-*@example.com" test users created by this suite (sessions,
// saved blends and cart items cascade with them). Never touches
// real accounts — the WHERE clause is the whole point of this file.

export default async function teardown() {
  // Node 24 built-in env loader; fallback to raw parse if it throws
  try {
    process.loadEnvFile('.env.local')
  } catch {
    const fs = await import('node:fs')
    for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    }
  }

  const url = process.env.DATABASE_URL
  if (!url) {
    console.warn('[e2e-teardown] No DATABASE_URL — skipping db cleanup')
    return
  }

  const connection = postgres(url)
  const db = drizzle(connection, { schema })

  try {
    // sessions / saved_blends / cart_items reference users with ON DELETE CASCADE,
    // so deleting the test users removes everything they created.
    const deleted = await db
      .delete(schema.users)
      .where(like(schema.users.email, 'e2e-%@example.com'))
      .returning({ email: schema.users.email })
    console.log(`[e2e-teardown] removed ${deleted.length} e2e test user(s)`)
  } catch (error) {
    console.warn('[e2e-teardown] cleanup failed:', (error as Error).message)
  } finally {
    await connection.end()
  }
}
