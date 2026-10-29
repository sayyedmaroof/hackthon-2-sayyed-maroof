import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthUser()
    return NextResponse.json({ user })
  } catch {
    // Database unreachable — treat as signed out rather than crashing the page.
    return NextResponse.json({ user: null })
  }
}
