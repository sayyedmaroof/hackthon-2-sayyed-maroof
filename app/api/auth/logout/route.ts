import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/db'
import { destroySession } from '@/lib/auth'

export async function POST() {
  await destroySession()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}
