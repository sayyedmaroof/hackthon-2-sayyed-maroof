import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { savedBlends } from '@/db/schema'
import { getAuthUser } from '@/lib/auth'
import { parseBlend } from '@/lib/storage'
import type { Blend } from '@/lib/types'

const MAX_BLENDS = 50

function unauthorized() {
  return NextResponse.json({ error: 'Sign in to sync your blends.' }, { status: 401 })
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const rows = await db
    .select({ blend: savedBlends.blend })
    .from(savedBlends)
    .where(eq(savedBlends.userId, user.id))

  const blends = rows.map((row) => parseBlend(row.blend)).filter((b): b is Blend => b !== null)
  return NextResponse.json({ blends })
}

/** Full-sync: replaces the signed-in user's saved blends with the posted list. */
export async function PUT(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rawBlends = Array.isArray((body as { blends?: unknown[] })?.blends)
    ? (body as { blends: unknown[] }).blends
    : []
  if (rawBlends.length > MAX_BLENDS) {
    return NextResponse.json({ error: `Blends are limited to ${MAX_BLENDS}.` }, { status: 400 })
  }

  const blends = rawBlends
    .map((blend) => parseBlend(blend))
    .filter((b): b is Blend => b !== null)
    // The payload can carry the same blend twice (double-tap save while
    // syncing). Keep the first occurrence: insert would otherwise trip
    // saved_blends_user_id_blend_id_pk and fail the whole sync.
    .filter((blend, index, all) => all.findIndex((b) => b.id === blend.id) === index)

  await db.transaction(async (tx) => {
    await tx.delete(savedBlends).where(eq(savedBlends.userId, user.id))
    if (blends.length > 0) {
      await tx.insert(savedBlends).values(
        blends.map((blend) => ({
          userId: user.id,
          blendId: blend.id,
          blend,
        })),
      )
    }
  })

  return NextResponse.json({ ok: true, count: blends.length })
}
