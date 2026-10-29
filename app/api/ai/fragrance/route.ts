/**
 * Shared AI endpoint — POST /api/ai/fragrance
 *
 * Modes: `builder` (Scent Advisor) and `concierge` (recommendations).
 *
 * Hard guarantees:
 *  - Requests are validated before any provider is contacted; the browser can
 *    only send the two defined shapes, never arbitrary prompts.
 *  - Model output is schema-validated and domain-checked server-side.
 *  - Only stable internal error codes reach the client — never raw upstream
 *    errors, SDK objects or secrets.
 *  - Guests are welcome (no mandatory auth); abuse is bounded per-client with
 *    a process-local rate limiter.
 */

import { NextResponse } from 'next/server'
import { runBuilderAI } from '@/lib/ai/builder'
import { runConciergeAI } from '@/lib/ai/concierge'
import { AiError, statusForCode } from '@/lib/ai/errors'
import { checkRateLimit } from '@/lib/ai/rate-limit'
import { MAX_ADVISOR_NOTES, aiRequestSchema } from '@/lib/ai/schemas'

// Requests hit live providers; never cache-touch this route.
export const dynamic = 'force-dynamic'

const PER_MINUTE = { builder: 12, concierge: 6 } as const
const WINDOW_MS = 60_000

function correlationId(): string {
  return `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local'
  return ip
}

function errorResponse(code: string, message: string, status: number, requestId?: string): NextResponse {
  const payload: Record<string, unknown> = { ok: false, error: { code, message } }
  if (requestId) (payload.error as Record<string, unknown>).requestId = requestId
  const headers: Record<string, string> = { 'cache-control': 'no-store' }
  if (requestId) headers['x-request-id'] = requestId
  return NextResponse.json(payload, { status, headers })
}

/**
 * Translates schema failures into human-readable guidance. Raw Zod messages
 * ("Too big: expected array to have <=N items") must never reach the chat UI.
 */
function friendlyValidationMessage(issues: { path: PropertyKey[] }[]): string {
  const path = issues[0]?.path.map(String).join('.') ?? ''
  if (path === 'context.noteIds') {
    return `Your blend now has more than ${MAX_ADVISOR_NOTES} notes — the advisor can analyse up to ${MAX_ADVISOR_NOTES}. Remove a note or two and try again.`
  }
  if (path === 'history') {
    return 'The conversation grew too long to analyse. Clear the advisor panel and ask again.'
  }
  if (path === 'message') {
    return 'That message is too long to analyse — try phrasing it more briefly.'
  }
  if (path === 'context') {
    return 'The blend snapshot could not be read. Refresh the builder and try again.'
  }
  if (path.startsWith('preferences')) {
    return 'Those fragrance preferences could not be processed — adjust them and try again.'
  }
  return 'That request could not be processed as sent. Try rephrasing it.'
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = correlationId()

  // ── Body size guard ──────────────────────────────────────────────────────
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (contentLength > 8_192) {
    return errorResponse('payload_too_large', 'Request is too large.', 413, requestId)
  }

  // ── Parse + validate request ─────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('invalid_request', 'Request body must be valid JSON.', 400, requestId)
  }

  const parsed = aiRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      'invalid_request',
      friendlyValidationMessage(parsed.error.issues),
      400,
      requestId,
    )
  }

  // ── Rate limiting (per client per mode) ──────────────────────────────────
  const key = `${clientKey(request)}:${parsed.data.mode}`
  const limit = checkRateLimit(key, PER_MINUTE[parsed.data.mode], WINDOW_MS)
  if (!limit.allowed) {
    const response = errorResponse('rate_limited', 'Please wait a moment before asking again.', 429, requestId)
    response.headers.set('retry-after', String(limit.retryAfterSeconds))
    return response
  }

  // ── Dispatch ─────────────────────────────────────────────────────────────
  try {
    if (parsed.data.mode === 'builder') {
      const result = await runBuilderAI({
        message: parsed.data.message,
        history: parsed.data.history,
        context: parsed.data.context,
      })
      return NextResponse.json({ ok: true, mode: 'builder', ...result }, { headers: { 'cache-control': 'no-store', 'x-request-id': requestId } })
    }

    const result = await runConciergeAI({
      mood: parsed.data.preferences.mood,
      occasion: parsed.data.preferences.occasion,
      intensity: parsed.data.preferences.intensity,
      families: parsed.data.preferences.families as import('@/lib/types').Family[],
      avoid: parsed.data.preferences.avoid,
      freeText: parsed.data.preferences.freeText,
    })
    return NextResponse.json({ ok: true, mode: 'concierge', ...result }, { headers: { 'cache-control': 'no-store', 'x-request-id': requestId } })
  } catch (error) {
    const aiError = error instanceof AiError ? error : null
    const code = aiError?.code ?? 'provider_unavailable'
    const message =
      aiError?.message ??
      'The fragrance advisor is momentarily unavailable. Your blend is untouched.'
    console.error(
      `[ai] request_id=${requestId} code=${code}${aiError?.detail ? ` detail=${aiError.detail}` : ''}${error instanceof Error ? ` type=${error.name}` : ''}`,
    )
    return errorResponse(code, message, statusForCode(code), requestId)
  }
}
