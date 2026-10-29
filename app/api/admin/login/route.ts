import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_SESSION_COOKIE,
} from '@/lib/app-config'
import {
  adminCookieOptions,
  createAdminSessionToken,
} from '@/lib/admin-auth'

/**
 * POST /api/admin/login — compares credentials against the app-configured
 * admin account (lib/app-config.ts) and sets a signed session cookie.
 */

let cachedHash: string | null = null
function passwordHash(): string {
  cachedHash ??= bcrypt.hashSync(ADMIN_PASSWORD, 10)
  return cachedHash
}

interface LoginBody {
  email?: unknown
  password?: unknown
}

export async function POST(request: Request) {
  let body: LoginBody
  try {
    body = (await request.json()) as LoginBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  const emailOk = email && email === ADMIN_EMAIL.toLowerCase()
  // bcrypt compare so the check stays resistant to short-circuit timing.
  const passwordOk = password.length > 0 && bcrypt.compareSync(password, passwordHash())

  if (!emailOk || !passwordOk) {
    return NextResponse.json(
      { error: 'Invalid admin credentials.' },
      { status: 401 },
    )
  }

  const response = NextResponse.json({
    admin: { email: ADMIN_EMAIL },
  })
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSessionToken(),
    adminCookieOptions(),
  )
  return response
}
