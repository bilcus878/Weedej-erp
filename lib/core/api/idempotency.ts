/**
 * Idempotency guard — prevents duplicate mutations when a client retries a request.
 *
 * Usage:
 *   Pass `Idempotency-Key: <uuid>` header on any mutating request.
 *   A second request with the same key (within TTL) returns the original response.
 *
 * Implementation: in-memory Map with periodic TTL cleanup.
 * For multi-process deployments, replace the store with Redis.
 *
 * TTL: 24 hours (matches Stripe convention).
 */

import { NextRequest }             from 'next/server'
import { IdempotencyConflictError } from './apiError'

const IDEMPOTENCY_HEADER = 'idempotency-key'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

type CachedResult = {
  body:        unknown
  status:      number
  expiresAt:   number
  inFlight:    boolean
}

// Module-level singleton (survives hot reloads in dev via globalThis)
declare global {
  // eslint-disable-next-line no-var
  var __idempotencyStore: Map<string, CachedResult> | undefined
}

function getStore(): Map<string, CachedResult> {
  if (!globalThis.__idempotencyStore) {
    globalThis.__idempotencyStore = new Map()
    // Periodic cleanup every 30 min
    setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of globalThis.__idempotencyStore!) {
        if (entry.expiresAt < now) globalThis.__idempotencyStore!.delete(key)
      }
    }, 30 * 60 * 1000)
  }
  return globalThis.__idempotencyStore
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Extract and validate the Idempotency-Key header. Returns null if absent. */
export function extractIdempotencyKey(req: NextRequest): string | null {
  const key = req.headers.get(IDEMPOTENCY_HEADER)?.trim()
  if (!key) return null
  // Must be between 8 and 128 printable ASCII characters
  if (key.length < 8 || key.length > 128 || !/^[\x21-\x7E]+$/.test(key)) return null
  return key
}

/**
 * Check if a cached response exists for this key.
 * Returns the cached body+status, or null if not found.
 * Throws IdempotencyConflictError if the request is in-flight (concurrent duplicate).
 */
export function checkIdempotencyCache(
  userId: string,
  rawKey: string,
): { body: unknown; status: number } | null {
  const store = getStore()
  const key   = `${userId}:${rawKey}`
  const entry = store.get(key)

  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    store.delete(key)
    return null
  }
  if (entry.inFlight) throw new IdempotencyConflictError()

  return { body: entry.body, status: entry.status }
}

/** Mark a key as in-flight before executing the handler. */
export function markIdempotencyInFlight(userId: string, rawKey: string): void {
  const store = getStore()
  const key   = `${userId}:${rawKey}`
  store.set(key, { body: null, status: 0, expiresAt: Date.now() + TTL_MS, inFlight: true })
}

/** Store the completed response so future retries return it immediately. */
export function storeIdempotencyResult(
  userId:  string,
  rawKey:  string,
  body:    unknown,
  status:  number,
): void {
  const store = getStore()
  const key   = `${userId}:${rawKey}`
  store.set(key, { body, status, expiresAt: Date.now() + TTL_MS, inFlight: false })
}

/** Remove an in-flight marker if the handler threw (so the client can retry). */
export function clearIdempotencyInFlight(userId: string, rawKey: string): void {
  const store = getStore()
  const key   = `${userId}:${rawKey}`
  const entry = store.get(key)
  if (entry?.inFlight) store.delete(key)
}
