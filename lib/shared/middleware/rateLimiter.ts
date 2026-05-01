/**
 * Rate limiter — sliding-window counter, per-identifier (IP or userId).
 *
 * Defaults (overridable per pipeline call):
 *   authenticated: 120 requests / 60 seconds
 *   unauthenticated: 30 requests / 60 seconds
 *   write operations: 30 requests / 60 seconds
 *
 * Implementation: in-memory sliding window (module-level singleton).
 * Replace with Redis INCR + EXPIRE for multi-process deployments.
 */

import { NextRequest }    from 'next/server'
import { RateLimitError } from '../api/apiError'

export interface RateLimitOptions {
  maxRequests: number
  windowMs:    number
}

export const RATE_LIMITS = {
  authenticated:   { maxRequests: 120, windowMs: 60_000 },
  unauthenticated: { maxRequests:  30, windowMs: 60_000 },
  write:           { maxRequests:  30, windowMs: 60_000 },
  strict:          { maxRequests:  10, windowMs: 60_000 }, // e.g. login, reset password
} as const satisfies Record<string, RateLimitOptions>

// ── Store ─────────────────────────────────────────────────────────────────────

type WindowEntry = { timestamps: number[] }

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, WindowEntry> | undefined
}

function getStore(): Map<string, WindowEntry> {
  if (!globalThis.__rateLimitStore) {
    globalThis.__rateLimitStore = new Map()
    // Sweep expired entries every 2 minutes
    setInterval(() => {
      const cutoff = Date.now() - 120_000
      for (const [id, entry] of globalThis.__rateLimitStore!) {
        if (entry.timestamps.every(t => t < cutoff)) {
          globalThis.__rateLimitStore!.delete(id)
        }
      }
    }, 2 * 60 * 1000)
  }
  return globalThis.__rateLimitStore
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed:    boolean
  remaining:  number
  resetAt:    number // epoch ms when the oldest request in window expires
}

/**
 * Check whether `identifier` is within the allowed rate limit.
 * Mutates the store (sliding-window: adds current timestamp, prunes old ones).
 * Throws RateLimitError with retryAfter seconds if the limit is exceeded.
 */
export function checkRateLimit(
  identifier: string,
  options:    RateLimitOptions = RATE_LIMITS.authenticated,
): RateLimitResult {
  const store = getStore()
  const now   = Date.now()
  const key   = `${identifier}:${options.maxRequests}:${options.windowMs}`

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Prune timestamps outside the sliding window
  const cutoff = now - options.windowMs
  entry.timestamps = entry.timestamps.filter(t => t >= cutoff)

  if (entry.timestamps.length >= options.maxRequests) {
    const oldest   = entry.timestamps[0]
    const resetAt  = oldest + options.windowMs
    const retryAfter = Math.ceil((resetAt - now) / 1000)
    throw new RateLimitError(retryAfter)
  }

  entry.timestamps.push(now)

  return {
    allowed:   true,
    remaining: options.maxRequests - entry.timestamps.length,
    resetAt:   entry.timestamps[0] + options.windowMs,
  }
}

// ── IP extraction ─────────────────────────────────────────────────────────────

export function extractIdentifier(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  return `ip:${ip}`
}
