import { readFileSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

// Read the URL directly from .env.local; drizzle-kit does not load it automatically.
const raw = readFileSync('.env.local', 'utf8')
const url = raw.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()

if (!url) throw new Error('DATABASE_URL is missing from .env.local')

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
})
