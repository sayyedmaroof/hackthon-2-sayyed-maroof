import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { SESSION_COOKIE, db } from '@/db'
import { users } from '@/db/schema'
import { cookieOptions, createSession, hashPassword } from '@/lib/auth'

interface SignupBody {
  name?: unknown
  email?: unknown
  password?: unknown
}

export async function POST(request: Request) {
  let body: SignupBody
  try {
    body = (await request.json()) as SignupBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ').slice(0, 80) : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 120) : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (name.length < 2) {
    return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'An account already exists for this email. Try signing in instead.' },
      { status: 409 },
    )
  }

  const userId = randomUUID()
  await db.insert(users).values({
    id: userId,
    email,
    name,
    passwordHash: hashPassword(password),
  })

  const token = await createSession(userId)
  const response = NextResponse.json({
    user: { id: userId, email, name, createdAt: new Date().toISOString() },
  })
  response.cookies.set(SESSION_COOKIE, token, cookieOptions())
  return response
}
