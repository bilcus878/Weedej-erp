/** NOT YET WIRED — Future API pipeline. Existing routes use @/lib/platform/auth/routeGuard directly. */
/**
 * apiPipeline — enterprise HOF that wraps every ERP API route handler.
 *
 * Pipeline order (Stripe / SAP style):
 *   Request
 *     → CORS preflight check
 *     → Rate limiting (per IP / per user)
 *     → CSRF validation (mutating methods only)
 *     → Authentication (requireAuth / requirePermission / requireAdmin)
 *     → Idempotency cache lookup
 *     → Body parsing + Zod schema validation
 *     → Sanitization (strip unknown keys)
 *     → Call handler (business logic, prisma.$transaction inside)
 *     → Store idempotency result
 *     → Return normalized response
 *
 * Usage:
 *   export const POST = withApiPipeline(
 *     async (req, ctx) => {
 *       const { body, actor, correlationId } = ctx
 *       // body is typed as the inferred Zod output
 *       const result = await CustomerOrderService.create(body, actor)
 *       return ok(result, correlationId, { status: 201 })
 *     },
 *     {
 *       permission: 'CREATE_CUSTOMER_ORDERS',
 *       schema:     createCustomerOrderSchema,
 *       rateLimit:  RATE_LIMITS.write,
 *       idempotent: true,
 *     }
 *   )
 */

import { NextRequest, NextResponse }             from 'next/server'
import { ZodSchema }                             from 'zod'
import { getServerSession }                      from 'next-auth'
import { authOptions }                           from '@/lib/platform/auth/auth'
import { prisma }                                from '@/lib/platform/db/prisma'
import type { AuthContext }                      from '@/lib/platform/auth/routeGuard'
import type { Permission }                       from '@/lib/shared/permissions'
import {
  AppError, UnauthorizedError, ForbiddenError,
  ValidationError, fromUnknown,
}                                                from '@/lib/core/api/apiError'
import {
  ok, fail, generateCorrelationId,
}                                                from '@/lib/core/api/responseWrapper'
import {
  extractIdempotencyKey, checkIdempotencyCache,
  markIdempotencyInFlight, storeIdempotencyResult,
  clearIdempotencyInFlight,
}                                                from '@/lib/core/api/idempotency'
import {
  checkRateLimit, extractIdentifier,
  RATE_LIMITS, type RateLimitOptions,
}                                                from '@/lib/core/middleware/rateLimiter'
import { applyCors, withCorsHeaders }            from '@/lib/core/middleware/corsGuard'
import { validateCsrf }                          from '@/lib/core/middleware/csrfGuard'

// ── Context passed to the handler ─────────────────────────────────────────────

export interface PipelineContext<TBody = unknown> {
  actor:         AuthContext
  body:          TBody
  correlationId: string
  req:           NextRequest
}

// ── Handler type ─────────────────────────────────────────────────────────────

export type PipelineHandler<TBody = unknown> = (
  req: NextRequest,
  ctx: PipelineContext<TBody>,
) => Promise<NextResponse>

// ── Options ───────────────────────────────────────────────────────────────────

export interface PipelineOptions<TBody = unknown> {
  /** Required permission (live DB check). Mutually exclusive with requireAdmin. */
  permission?:   Permission
  /** Require ADMIN role instead of a permission. */
  requireAdmin?: boolean
  /** Zod schema to validate the request body. POST/PUT/PATCH only. */
  schema?:       ZodSchema<TBody>
  /** Rate limit preset or custom options. Defaults to RATE_LIMITS.authenticated. */
  rateLimit?:    RateLimitOptions | false
  /** Enable idempotency key support. Defaults to false. */
  idempotent?:   boolean
  /** Skip authentication entirely (public endpoint). */
  public?:       boolean
}

// ── RBAC helper (live DB check) ───────────────────────────────────────────────

async function resolveAuth(
  userId: string,
  permission?: Permission,
  requireAdmin?: boolean,
): Promise<AuthContext> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { isActive: true, email: true, name: true },
  })
  if (!user || !user.isActive) throw new UnauthorizedError()

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  })

  const roles       = userRoles.map(ur => ur.role.name)
  const permissions = [...new Set(
    userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.name))
  )]

  if (requireAdmin && !roles.includes('ADMIN')) {
    throw new ForbiddenError()
  }
  if (permission && !permissions.includes(permission)) {
    throw new ForbiddenError()
  }

  return {
    userId,
    username:  user.email ?? user.name ?? '',
    roles,
    permissions,
    ipAddress: null, // injected below
  }
}

// ── Main HOF ──────────────────────────────────────────────────────────────────

export function withApiPipeline<TBody = unknown>(
  handler: PipelineHandler<TBody>,
  options: PipelineOptions<TBody> = {},
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    const correlationId = generateCorrelationId()
    const origin        = req.headers.get('origin') ?? ''

    // ── 1. CORS preflight ──────────────────────────────────────────────────
    const corsResponse = applyCors(req)
    if (corsResponse) return withCorsHeaders(corsResponse, origin)

    try {
      // ── 2. Rate limiting ──────────────────────────────────────────────────
      if (options.rateLimit !== false) {
        const session = await getServerSession(authOptions).catch(() => null)
        const userId  = (session?.user as any)?.id as string | undefined
        const id      = extractIdentifier(req, userId)
        const limit   = options.rateLimit ?? (
          req.method === 'GET' ? RATE_LIMITS.authenticated : RATE_LIMITS.write
        )
        checkRateLimit(id, limit)
      }

      // ── 3. CSRF validation ────────────────────────────────────────────────
      validateCsrf(req)

      // ── 4. Authentication + RBAC ──────────────────────────────────────────
      let actor: AuthContext = {
        userId: '', username: 'anonymous', roles: [],
        permissions: [], ipAddress: null,
      }

      if (!options.public) {
        const session = await getServerSession(authOptions)
        if (!session?.user) throw new UnauthorizedError()

        const userId = (session.user as any).id as string
        actor = await resolveAuth(userId, options.permission, options.requireAdmin)
      }

      // Inject IP
      actor = {
        ...actor,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0].trim()
          ?? req.headers.get('x-real-ip')
          ?? null,
      }

      // ── 5. Idempotency cache lookup ───────────────────────────────────────
      let idempotencyKey: string | null = null
      if (options.idempotent && actor.userId) {
        idempotencyKey = extractIdempotencyKey(req)
        if (idempotencyKey) {
          const cached = checkIdempotencyCache(actor.userId, idempotencyKey)
          if (cached) {
            return withCorsHeaders(
              NextResponse.json(cached.body, { status: cached.status }),
              origin,
            )
          }
          markIdempotencyInFlight(actor.userId, idempotencyKey)
        }
      }

      // ── 6. Body parsing + Zod validation ─────────────────────────────────
      let body: TBody = undefined as TBody
      const hasMutableBody = ['POST', 'PUT', 'PATCH'].includes(req.method)

      if (options.schema && hasMutableBody) {
        let raw: unknown
        try {
          raw = await req.json()
        } catch {
          throw new ValidationError('Request body must be valid JSON')
        }

        const result = options.schema.safeParse(raw)
        if (!result.success) {
          const issues = result.error.issues.map(i => ({
            path:    i.path.join('.'),
            message: i.message,
          }))
          throw new ValidationError('Validation failed', issues)
        }
        body = result.data
      }

      // ── 7. Call handler ───────────────────────────────────────────────────
      const ctx: PipelineContext<TBody> = { actor, body, correlationId, req }
      const response = await handler(req, ctx)

      // ── 8. Store idempotency result ───────────────────────────────────────
      if (idempotencyKey && actor.userId) {
        try {
          const responseBody = await response.clone().json()
          storeIdempotencyResult(actor.userId, idempotencyKey, responseBody, response.status)
        } catch {
          // Non-JSON response — don't cache
          clearIdempotencyInFlight(actor.userId, idempotencyKey)
        }
      }

      // ── 9. Attach correlation ID + CORS headers to response ───────────────
      const finalResponse = withCorsHeaders(response, origin)
      finalResponse.headers.set('X-Correlation-Id', correlationId)
      return finalResponse

    } catch (err: unknown) {
      // Clear idempotency in-flight marker on error so the client can retry
      const session = await getServerSession(authOptions).catch(() => null)
      const userId  = (session?.user as any)?.id as string | undefined
      const key     = options.idempotent ? extractIdempotencyKey(req) : null
      if (key && userId) clearIdempotencyInFlight(userId, key)

      const appErr = fromUnknown(err)

      // Only log unexpected server errors — not auth / validation failures
      if (appErr.statusCode >= 500) {
        console.error(`[API] ${correlationId} ${req.method} ${req.nextUrl.pathname}`, appErr)
      }

      const errResponse = withCorsHeaders(fail(appErr, correlationId), origin)
      errResponse.headers.set('X-Correlation-Id', correlationId)
      return errResponse
    }
  }
}
