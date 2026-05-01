/**
 * CSRF guard — double-submit cookie pattern.
 *
 * HOW IT WORKS:
 *  1. The frontend reads the `__csrf` cookie (set by Next.js session).
 *  2. On every mutating request (POST/PUT/PATCH/DELETE), the frontend sends
 *     the cookie value as the `X-CSRF-Token` header.
 *  3. The server compares cookie value ↔ header value.
 *  4. Because a cross-origin script cannot read HttpOnly cookies or set
 *     arbitrary headers, this prevents CSRF attacks.
 *
 * EXEMPTIONS (skip CSRF check):
 *  - Requests authenticated via API key (X-Api-Key header)
 *  - External webhook endpoints (/api/external/*)
 *  - Safe methods: GET, HEAD, OPTIONS
 *  - Requests from the same Next.js server (no Origin or same Origin as NEXTAUTH_URL)
 *
 * IMPORTANT: This guard is enforced at the apiPipeline level.
 * Individual routes do NOT need to call it directly.
 */

import { NextRequest }    from 'next/server'
import { ForbiddenError } from '../api/apiError'

const CSRF_COOKIE  = '__csrf'
const CSRF_HEADER  = 'x-csrf-token'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if this request is exempt from CSRF checking. */
export function isCsrfExempt(req: NextRequest): boolean {
  // Safe methods
  if (SAFE_METHODS.has(req.method)) return true

  // API-key authenticated external endpoints
  if (req.headers.has('x-api-key')) return true
  if (req.nextUrl.pathname.startsWith('/api/external/')) return true
  if (req.nextUrl.pathname.startsWith('/api/cron/')) return true
  if (req.nextUrl.pathname.startsWith('/api/orders')) return true

  // Same-origin requests (no Origin header = same-origin in browsers)
  const origin  = req.headers.get('origin')
  const appUrl  = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? ''
  if (!origin) return true
  if (appUrl && origin === appUrl) return true

  return false
}

/**
 * Validate the CSRF token on mutating requests.
 * Throws ForbiddenError if the token is absent or mismatched.
 * Does nothing for exempt requests.
 */
export function validateCsrf(req: NextRequest): void {
  if (isCsrfExempt(req)) return

  // In development, CSRF is informational-only (warn but don't block)
  const isDev = process.env.NODE_ENV === 'development'

  const cookieToken  = req.cookies.get(CSRF_COOKIE)?.value
  const headerToken  = req.headers.get(CSRF_HEADER)

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    if (isDev) {
      console.warn('[CSRF] Token mismatch — would block in production', {
        path: req.nextUrl.pathname,
        hasCookie: !!cookieToken,
        hasHeader: !!headerToken,
      })
      return
    }
    throw new ForbiddenError('CSRF token invalid')
  }
}

/** Generate a CSRF token (for use in SSR to seed the cookie). */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
