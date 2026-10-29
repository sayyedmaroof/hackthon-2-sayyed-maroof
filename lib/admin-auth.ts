import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_SECRET,
  ADMIN_SESSION_TTL_MS,
} from './app-config'

/**
 * Minimal admin session: a signed (HMAC-SHA256) expiry stamp stored in an
 * httpOnly cookie. Stateless — no DB rows needed for the admin identity.
 */

export function createAdminSessionToken(): string {
  const expires = Date.now() + ADMIN_SESSION_TTL_MS
  const signature = createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(String(expires))
    .digest('hex')
  return `${expires}:${signature}`
}

function verifyAdminSessionToken(token: string): boolean {
  const separator = token.indexOf(':')
  if (separator < 0) return false
  const expiresRaw = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  const expires = Number(expiresRaw)
  if (!Number.isFinite(expires) || expires < Date.now()) return false

  const expected = createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(expiresRaw)
    .digest('hex')
  try {
    const a = Buffer.from(signature, 'hex')
    const b = Buffer.from(expected, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
  }
}

/** True when the current request carries a valid admin session cookie. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(ADMIN_SESSION_COOKIE)?.value
  return Boolean(token) && verifyAdminSessionToken(token as string)
}
