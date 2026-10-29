import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { SESSION_COOKIE, db } from '@/db'
import { users } from '@/db/schema'
import { cookieOptions, createSession, verifyPassword } from '@/lib/auth'

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

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 120) : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 })
  }

  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  const account = rows[0]
  if (!account || !verifyPassword(password, account.passwordHash)) {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 })
  }

  const token = await createSession(account.id)
  const response = NextResponse.json({
    user: {
      id: account.id,
      email: account.email,
      name: account.name,
      createdAt: account.createdAt.toISOString(),
    },
  })
  response.cookies.set(SESSION_COOKIE, token, cookieOptions())
  return response
}
