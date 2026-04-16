/**
 * GET /api/cron/webhook-retry
 *
 * Retries due webhook deliveries. Protected by CRON_SECRET.
 * Set up as a Vercel Cron: { "path": "/api/cron/webhook-retry", "schedule": "* * * * *" }
 * or call with: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { retryDueWebhooks } from '@/lib/eshopWebhook'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    await retryDueWebhooks()
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[WebhookRetry] Cron error:', err?.message)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
