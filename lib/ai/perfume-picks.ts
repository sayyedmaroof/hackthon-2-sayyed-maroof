/**
 * perfume-picks.ts — Optional adapter for the Perfume Picks MCP service.
 *
 * VERIFIED 2026-10-29 against https://mcp.perfumepicks.app:
 *  - Streamable HTTP transport (POST JSON-RPC, `text/event-stream` responses).
 *  - `initialize` → server "perfume-picks" v1.0.5, tools/list returns 8 tools
 *    (search_fragrances, get_fragrance, find_dupes, find_similar,
 *    get_recommendations, compare_fragrances, trending_fragrances,
 *    what_to_wear_tonight).
 *  - `tools/call` for `search_fragrances` returned real fragrance records.
 *
 * This adapter only ever ADDS optional inspiration context. It is treated as
 * untrusted external data: results are shown as commercial-fragrance
 * references with source attribution and are never converted directly into
 * blend note IDs.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'

const MCP_ENDPOINT = 'https://mcp.perfumepicks.app'
const REQUEST_TIMEOUT_MS = 5_000
const CACHE_TTL_MS = 30 * 60 * 1000
const CACHE_MAX = 40

export interface PerfumePickRef {
  name: string
  brand: string
  family?: string
  accords?: string[]
}

const cache = new Map<string, { at: number; value: PerfumePickRef[] }>()
const inFlight = new Map<string, Promise<PerfumePickRef[] | null>>()

/** Heuristic: only pay the MCP round-trip when the user references real perfumes. */
export function isPerfumeReference(text: string): boolean {
  return /\b(inspired by|similar to|compared to|smells? like|reminder of|such as|like)\s+[A-Z][\w'’-]+/i.test(text)
}

function cleanEntry(entry: unknown): PerfumePickRef | null {
  if (typeof entry !== 'object' || entry === null) return null
  const record = entry as Record<string, unknown>
  const name = typeof record.name === 'string' ? record.name.slice(0, 60) : null
  const brand = typeof record.brand === 'string' ? record.brand.slice(0, 40) : null
  if (!name || !brand) return null
  const family = typeof record.fragrance_family === 'string' ? record.fragrance_family.slice(0, 30) : undefined
  const accordsRaw = record.top_accords
  const accords = Array.isArray(accordsRaw)
    ? accordsRaw.filter((a): a is string => typeof a === 'string').slice(0, 5)
    : undefined
  return { name, brand, family, accords }
}

/** MCP tool results for this server carry a JSON document as a text block. */
function extractRefs(raw: string, limit: number): PerfumePickRef[] {
  try {
    const parsed = JSON.parse(raw) as { fragrances?: unknown[] }
    return (parsed.fragrances ?? [])
      .map(cleanEntry)
      .filter((r): r is PerfumePickRef => r !== null)
      .slice(0, limit)
  } catch {
    return []
  }
}

async function withMcpClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ name: 'scentbuild-studio', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(new URL(MCP_ENDPOINT), {
    requestInit: { headers: { 'mcp-protocol-version': '2025-06-18' } },
  })
  await client.connect(transport)
  try {
    return await fn(client)
  } finally {
    await client.close().catch(() => {})
  }
}

/**
 * Fetch a few real commercial fragrances matching the query. Returns null
 * when the service is unreachable — callers must proceed without it.
 * Process-local cache + in-flight dedupe keep the cost bounded.
 */
export async function fetchPerfumeInspiration(query: string, limit = 3): Promise<PerfumePickRef[] | null> {
  const key = `${query.trim().toLowerCase()}|${limit}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value

  const running = inFlight.get(key)
  if (running) return running

  const task = (async () => {
    try {
      const refs = await withMcpClient(async (client) => {
        const result = await client.request(
          { method: 'tools/call', params: { name: 'search_fragrances', arguments: { query: query.slice(0, 120), limit } } },
          CallToolResultSchema,
          { timeout: REQUEST_TIMEOUT_MS },
        )
        const textBlock = (result.content ?? []).find((block) => block.type === 'text')
        return extractRefs(textBlock && 'text' in textBlock ? String(textBlock.text) : '', limit)
      })
      cache.set(key, { at: Date.now(), value: refs })
      if (cache.size > CACHE_MAX) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0]
        if (oldest) cache.delete(oldest[0])
      }
      return refs
    } catch {
      // Unreachable or slow MCP: never blocks the core AI features.
      console.error('[ai] perfume-picks mcp unavailable; continuing without external inspiration')
      return null
    } finally {
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, task)
  return task
}
