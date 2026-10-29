import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/app-config'

/**
 * POST /api/admin/logout — clears the admin session cookie.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  })
  return response
}
