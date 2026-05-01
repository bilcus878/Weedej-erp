/**
 * CORS guard — enforces allowed-origin policy for internal API routes.
 *
 * Rules:
 *  - Internal API routes (/api/*) ONLY accept requests from same-origin or
 *    explicitly whitelisted origins.
 *  - External API routes (/api/external/*) handle their own CORS via apiKeyAuth.
 *  - Preflight OPTIONS requests are answered immediately.
 *
 * Configure via ALLOWED_ORIGINS env var (comma-separated).
 * Falls back to NEXTAUTH_URL in production, or allows all origins in dev.
 */

import { NextRequest, NextResponse } from 'next/server'

// ── Config ────────────────────────────────────────────────────────────────────

function getAllowedOrigins(): Set<string> {
  const raw = process.env.ALLOWED_ORIGINS ?? ''
  const fromEnv = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  // Always include the app's own origin
  const appUrl = process.env.NEXTAUTH_URL ?? ''
  if (appUrl) fromEnv.push(appUrl.replace(/\/$/, ''))

  return new Set(fromEnv)
}

const CORS_HEADERS = {
  'Access-Control-Allow-Methods':     'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':     'Content-Type, Authorization, Idempotency-Key, X-CSRF-Token',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age':           '86400',
} as const

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Validate the Origin header against the allowlist.
 * Returns a NextResponse for OPTIONS preflight, or null to continue.
 * Throws nothing — CORS enforcement is via response headers only
 * (the browser enforces the policy, not the server).
 */
export function applyCors(req: NextRequest): NextResponse | null {
  const origin  = req.headers.get('origin') ?? ''
  const allowed = getAllowedOrigins()

  // Development: allow all origins
  const isDev = process.env.NODE_ENV === 'development'

  const originAllowed = isDev || allowed.size === 0 || allowed.has(origin)
  const allowOrigin   = originAllowed ? origin || '*' : ''

  const responseHeaders: Record<string, string> = {
    ...CORS_HEADERS,
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: responseHeaders })
  }

  return null
}

/** Attach CORS headers to an existing NextResponse. */
export function withCorsHeaders(
  res:    NextResponse,
  origin: string,
): NextResponse {
  const isDev   = process.env.NODE_ENV === 'development'
  const allowed = getAllowedOrigins()
  const allow   = isDev || allowed.size === 0 || allowed.has(origin)

  if (allow && origin) {
    res.headers.set('Access-Control-Allow-Origin',      origin)
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Vary',                             'Origin')
  }

  return res
}
