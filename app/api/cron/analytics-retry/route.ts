/**
 * GET /api/cron/analytics-retry
 *
 * Retries failed analytics event deliveries to GA4 and Meta CAPI.
 * Protected by CRON_SECRET (same as the webhook-retry cron).
 *
 * Vercel Cron config (vercel.json):
 *   { "path": "/api/cron/analytics-retry", "schedule": "every 5 minutes" }
 *
 * Retry policy:
 *   - Max 3 attempts per delivery
 *   - Exponential back-off: 5 min → 15 min → 45 min
 *   - After 3 failures: status set to permanently_failed (no more retries)
 */

import { NextRequest, NextResponse } from 'next/server'
import { retryFailedDeliveries }     from '@/lib/analytics/eventPipeline'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured — CRON_SECRET missing' }, { status: 503 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await retryFailedDeliveries()
    console.log(`[Analytics Retry] retried=${result.retried} permanentlyFailed=${result.permanentlyFailed}`)
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    console.error('[Analytics Retry] Cron error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
