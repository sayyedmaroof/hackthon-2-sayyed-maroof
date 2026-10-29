import path from 'node:path'

/**
 * Runs once when the Next.js server boots (dev or production).
 * Keeps the PostgreSQL schema in sync by applying pending Drizzle
 * migrations from db/migrations on every application startup.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only the Node.js runtime has DATABASE_URL / pg access.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const [{ migrate }, { db }] = await Promise.all([
      import('drizzle-orm/postgres-js/migrator'),
      import('./db'),
    ])

    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'db/migrations') })
    console.log('[startup] database migrations are up to date.')
  } catch (error) {
    // Never crash the app because the database is unreachable; routes that
    // need it will surface a friendly error instead.
    console.error('[startup] failed to apply database migrations:', error)
  }
}
