/**
 * POST /api/analytics/events
 *
 * Secure analytics event ingestion endpoint — receives events from the e-shop
 * and stores them in analytics_events. Dispatches async to GA4 + Meta CAPI.
 *
 * Security:
 *   - HMAC-SHA256 signature verification  (X-Analytics-Signature header)
 *   - Replay protection via timestamp window (±5 minutes)
 *   - Deduplication via eventId unique constraint
 *   - Schema validation per event type (Zod)
 *   - Rate limiting: 500 events/minute per source
 *   - CORS locked to ESHOP_URL
 *
 * Response:
 *   202 Accepted  — event received and will be dispatched
 *   200 OK        — duplicate eventId, already processed (idempotent)
 *   400 Bad Request — schema validation failure
 *   401 Unauthorized — bad/missing HMAC signature
 *   429 Too Many Requests — rate limit exceeded
 */

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { prisma }                    from '@/lib/prisma'
import { verifyAnalyticsHmac }       from '@/lib/analytics/hmac'
import { storeEvent, dispatchAsync } from '@/lib/analytics/eventPipeline'
import { ANALYTICS_EVENT_TYPES }     from '@/lib/analytics/types'

export const dynamic = 'force-dynamic'

// ── CORS ─────────────────────────────────────────────────────────────────────

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = process.env.ESHOP_URL ?? ''
  const allow   = origin === allowed ? origin : allowed
  return {
    'Access-Control-Allow-Origin':  allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Analytics-Timestamp, X-Analytics-Signature',
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const checkoutItemSchema = z.object({
  productId:    z.string().min(1),
  productName:  z.string().min(1),
  variantId:    z.string().optional(),
  variantName:  z.string().optional(),
  price:        z.number().nonnegative(),
  quantity:     z.number().int().positive(),
})

const propertiesSchema = z.union([
  // product_view
  z.object({
    productId:   z.string().min(1),
    productName: z.string().min(1),
    price:       z.number().optional(),
    currency:    z.string().optional(),
    categoryId:  z.string().optional(),
  }),
  // add_to_cart
  z.object({
    productId:   z.string().min(1),
    productName: z.string().min(1),
    variantId:   z.string().optional(),
    variantName: z.string().optional(),
    price:       z.number().nonnegative(),
    currency:    z.string(),
    quantity:    z.number().int().positive(),
  }),
  // begin_checkout
  z.object({
    value:    z.number().nonnegative(),
    currency: z.string(),
    items:    z.array(checkoutItemSchema),
  }),
  // purchase
  z.object({
    orderId:     z.string().min(1),
    erpOrderId:  z.string().optional(),
    revenue:     z.number().nonnegative(),
    shipping:    z.number().nonnegative(),
    tax:         z.number().nonnegative(),
    currency:    z.string(),
    items:       z.array(checkoutItemSchema),
    email:       z.string().email().optional(),
    phone:       z.string().optional(),
    firstName:   z.string().optional(),
    lastName:    z.string().optional(),
  }),
  // refund
  z.object({
    orderId:  z.string().min(1),
    revenue:  z.number().nonnegative(),
    currency: z.string(),
    items:    z.array(checkoutItemSchema).optional(),
  }),
  // signup
  z.object({
    method: z.string(),
  }),
])

const ingressSchema = z.object({
  eventId:         z.string().uuid(),
  eventType:       z.enum(ANALYTICS_EVENT_TYPES),
  entityType:      z.string().optional(),
  entityId:        z.string().optional(),
  userId:          z.string().optional(),
  sessionId:       z.string().optional(),
  gaClientId:      z.string().optional(),
  fbp:             z.string().optional(),
  fbc:             z.string().optional(),
  source:          z.literal('eshop'),
  properties:      propertiesSchema,
  ipAddress:       z.string().optional(),
  userAgent:       z.string().optional(),
  clientTimestamp: z.string().datetime(),
})

// ── Rate limiting (sliding window — 500 events/min per source) ────────────────

async function isRateLimited(source: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60_000)
  const count = await prisma.analyticsEvent.count({
    where: { source, createdAt: { gte: windowStart } },
  })
  return count >= 500
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)

  // ① HMAC signature verification
  const secret = process.env.ANALYTICS_HMAC_SECRET
  if (!secret) {
    console.error('[Analytics Ingestion] ANALYTICS_HMAC_SECRET is not configured')
    return NextResponse.json({ error: 'Analytics endpoint not configured' }, { status: 503, headers })
  }

  const rawBody = await req.text()
  const hmacResult = verifyAnalyticsHmac(
    secret,
    req.headers.get('X-Analytics-Timestamp'),
    req.headers.get('X-Analytics-Signature'),
    rawBody,
  )
  if (!hmacResult.ok) {
    return NextResponse.json({ error: hmacResult.message }, { status: hmacResult.status, headers })
  }

  // ② Schema validation
  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const parsed = ingressSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Schema validation failed', issues: parsed.error.flatten() },
      { status: 400, headers },
    )
  }

  const incoming = parsed.data

  // ③ Rate limit check
  if (await isRateLimited(incoming.source)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  // ④ Store event (returns null if eventId already exists → idempotent 200)
  let stored
  try {
    stored = await storeEvent(incoming)
  } catch (err: unknown) {
    console.error('[Analytics Ingestion] Storage error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers })
  }

  if (!stored) {
    // Duplicate eventId — already processed
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200, headers })
  }

  // ⑤ Fire-and-forget dispatch to GA4 + Meta — MUST NOT block the response
  dispatchAsync(stored)

  return NextResponse.json({ ok: true, id: stored.id }, { status: 202, headers })
}
