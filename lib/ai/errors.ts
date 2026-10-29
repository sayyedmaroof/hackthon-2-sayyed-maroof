/**
 * errors.ts — Error normalisation for the AI provider layer.
 *
 * Classification drives failover: only *eligible transient* failures allow a
 * single fallback attempt. Permanent problems (missing keys, wrong model,
 * invalid input) surface immediately with a stable internal code.
 */

export type AiErrorCode =
  | 'invalid_request'
  | 'payload_too_large'
  | 'rate_limited'
  | 'missing_key'
  | 'bad_config'
  | 'invalid_model'
  | 'timeout'
  | 'provider_unavailable'
  | 'bad_output'
  | 'no_result'

/** Errors thrown inside the AI layer. Carries a safe, client-facing message. */
export class AiError extends Error {
  readonly code: AiErrorCode
  /** Whether a fallback provider should be attempted. */
  readonly retryable: boolean
  /** Internal detail for logs only — never sent to the browser. */
  readonly detail?: string

  constructor(code: AiErrorCode, message: string, options?: { retryable?: boolean; detail?: string }) {
    super(message)
    this.name = 'AiError'
    this.code = code
    this.retryable = options?.retryable ?? false
    this.detail = options?.detail
  }
}

/** Client-facing error payload shape used by the API route. */
export interface AiClientError {
  code: AiErrorCode
  message: string
}

const RATE_LIMIT =
  /429|quota|rate\s*limit|resource_exhausted|too\s*many\s*requests/i

const UNAVAILABLE =
  /503|502|504|overload|temporarily\s*unavailable|high\s*demand|service\s*unavailable|bad\s*gateway|timeout|timed?\s*out/i

const HTTP_STATUS_AUTH =
  /401|403|api\s*key|unauthorized|forbidden|permission\s*denied|api_key_invalid|expired/i

/**
 * Map an arbitrary provider/SDK error to an AiError with failover semantics.
 * notion: anything that looks transient (unavailability, timeouts, 429) is
 * retryable exactly once — on the fallback provider.
 */
export function normalizeProviderError(error: unknown, provider: string): AiError {
  if (error instanceof AiError) return error

  const raw =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'string'
        ? error
        : 'unknown'

  if (looksLikeAbort(error)) {
    return new AiError('timeout', 'The fragrance advisor took too long to respond.', {
      retryable: true,
      detail: `${provider} request aborted (timeout)`,
    })
  }
  if (RATE_LIMIT.test(raw)) {
    return new AiError('rate_limited', 'The fragrance advisor is a little busy right now.', {
      retryable: true,
      detail: `${provider} rate limited: ${truncate(raw)}`,
    })
  }
  if (UNAVAILABLE.test(raw)) {
    return new AiError('provider_unavailable', 'The fragrance advisor is momentarily unavailable.', {
      retryable: true,
      detail: `${provider} unavailable: ${truncate(raw)}`,
    })
  }
  if (/401|403|api\s*key|unauthorized|forbidden|permission\s*denied|api_key_invalid|expired/i.test(raw)) {
    return new AiError('missing_key', 'The fragrance advisor is not configured correctly.', {
      retryable: false,
      detail: `${provider} auth/config error: ${truncate(raw)}`,
    })
  }
  if (/model/i.test(raw) && /not\s*found|unsupported|no longer available|does not exist/i.test(raw)) {
    return new AiError('invalid_model', 'The fragrance advisor is not configured correctly.', {
      retryable: false,
      detail: `${provider} bad model: ${truncate(raw)}`,
    })
  }
  // Unknown shape: treat as transient so a healthy fallback can still rescue
  // the request, but keep the raw message server-side only.
  return new AiError('provider_unavailable', 'The fragrance advisor is momentarily unavailable.', {
    retryable: true,
    detail: `${provider} error: ${truncate(raw)}`,
  })
}

function looksLikeAbort(error: unknown): boolean {
  return (
    error instanceof DOMException ||
    (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError'))
  )
}

function truncate(value: string, max = 240): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

/** Stable HTTP status mapping for the route handler. */
export function statusForCode(code: AiErrorCode): number {
  switch (code) {
    case 'invalid_request':
      return 400
    case 'payload_too_large':
      return 413
    case 'rate_limited':
      return 429
    case 'missing_key':
    case 'bad_config':
    case 'invalid_model':
      return 502
    case 'timeout':
    case 'provider_unavailable':
      return 503
    case 'bad_output':
    case 'no_result':
      return 502
  }
}
