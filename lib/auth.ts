import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { and, eq, gt } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { SESSION_COOKIE, db } from '../db'
import { sessions, users } from '../db/schema'

export interface AuthUser {
  id: string
  email: string
  name: string
}

const SESSION_TTL_DAYS = 30

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash)
  } catch {
    return false
  }
}

function expiryDate(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiryDate(),
  }
}

/** Creates a DB-backed session and returns the token to store in a cookie. */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await db.insert(sessions).values({ token, userId, expiresAt: expiryDate() })
  return token
}

/**
 * Resolves the signed-in user from the session cookie.
 * Expired or unknown sessions simply return null.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1)

  return rows[0] ?? null
}

/** Deletes the current session (idempotent — safe to call with no session). */
export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token))
  }
}
