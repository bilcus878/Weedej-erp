/**
 * ERP → E-shop webhook delivery
 *
 * Signs payloads with HMAC-SHA256 (shared secret: ERP_WEBHOOK_SECRET).
 * Stores every attempt in EshopWebhookLog.
 * Retries: 1 min → 5 min → 15 min (exponential-ish backoff, max 3 attempts).
 * Dead-letter: after 3 failures status = 'dead', admin must intervene.
 *
 * GDPR: webhook payload contains order IDs only — NO customer PII.
 * § 35 ZDPH: invoiceUrl is a stable, authenticated URL (not the PDF bytes).
 */

import crypto from 'crypto'
import { prisma } from './prisma'

// Retry schedule in minutes
const RETRY_DELAYS_MIN = [1, 5, 15]

export interface OrderShippedPayload {
  eshopOrderId:   string   // UUID — no PII
  erpOrderNumber: string   // ESH{YYYY}{XXXX}
  shippedAt:      string   // ISO 8601
  trackingNumber: string | null
  carrier:        string | null
  invoiceUrl:     string | null  // authenticated URL, no PII
}

// ─── HMAC helpers ─────────────────────────────────────────────────────────────

function hmacSecret(): string {
  const secret = process.env.ERP_WEBHOOK_SECRET
  if (!secret) throw new Error('ERP_WEBHOOK_SECRET env var is not set')
  return secret
}

export function signPayload(body: string): string {
  const sig = crypto.createHmac('sha256', hmacSecret()).update(body).digest('hex')
  return `sha256=${sig}`
}

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex')
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a webhook for the "order-shipped" event.
 * Call this after the warehouse processes the delivery note.
 * The actual HTTP call happens immediately; retries are scheduled via nextRetryAt.
 */
export async function enqueueOrderShippedWebhook(
  customerOrderId: string,
  payload: OrderShippedPayload,
): Promise<void> {
  const eshopBaseUrl = process.env.ESHOP_URL?.replace(/\/$/, '')
  if (!eshopBaseUrl) {
    console.warn('[EshopWebhook] ESHOP_URL not set — skipping webhook')
    return
  }

  const targetUrl  = `${eshopBaseUrl}/api/webhooks/erp/order-shipped`
  const bodyStr    = JSON.stringify(payload)
  const payloadHash = sha256Hex(bodyStr)

  // Create log entry
  const log = await prisma.eshopWebhookLog.create({
    data: {
      customerOrderId,
      eshopOrderId:   payload.eshopOrderId,
      erpOrderNumber: payload.erpOrderNumber,
      event:          'order-shipped',
      targetUrl,
      payload:        bodyStr,
      payloadHash,
      status:         'pending',
    },
  })

  // Fire first attempt immediately (non-blocking for the caller)
  attemptDelivery(log.id).catch(err =>
    console.error(`[EshopWebhook] Initial attempt failed for logId=${log.id}:`, err?.message)
  )
}

/**
 * Called by the cron endpoint to retry pending/retrying webhooks whose
 * nextRetryAt is in the past.
 */
export async function retryDueWebhooks(): Promise<void> {
  const due = await prisma.eshopWebhookLog.findMany({
    where: {
      status:       { in: ['retrying'] },
      nextRetryAt:  { lte: new Date() },
      attemptCount: { lt: 3 },
    },
  })

  for (const log of due) {
    await attemptDelivery(log.id)
  }
}

// ─── Internal delivery engine ─────────────────────────────────────────────────

async function attemptDelivery(logId: string): Promise<void> {
  const log = await prisma.eshopWebhookLog.findUnique({ where: { id: logId } })
  if (!log) return
  if (log.status === 'delivered' || log.status === 'dead') return

  const signature = signPayload(log.payload)
  let httpStatus: number | null = null
  let error: string | null = null

  try {
    const res = await fetch(log.targetUrl, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-ERP-Signature': signature,
      },
      body:   log.payload,
      signal: AbortSignal.timeout(10_000),
    })
    httpStatus = res.status
  } catch (err: any) {
    error = err?.message ?? 'Network error'
  }

  const attemptCount = log.attemptCount + 1
  const success      = httpStatus !== null && httpStatus >= 200 && httpStatus < 300

  if (success) {
    await prisma.eshopWebhookLog.update({
      where: { id: logId },
      data: {
        status:        'delivered',
        attemptCount,
        lastAttemptAt: new Date(),
        lastHttpStatus: httpStatus,
        lastError:     null,
        nextRetryAt:   null,
      },
    })
    console.log(`[EshopWebhook] Delivered logId=${logId} erpOrderNumber=${log.erpOrderNumber}`)
    return
  }

  // Failure path
  const nextDelayMin = RETRY_DELAYS_MIN[attemptCount - 1] ?? null
  const isDead       = attemptCount >= 3

  await prisma.eshopWebhookLog.update({
    where: { id: logId },
    data: {
      status:         isDead ? 'dead' : 'retrying',
      attemptCount,
      lastAttemptAt:  new Date(),
      lastHttpStatus: httpStatus,
      lastError:      error ?? `HTTP ${httpStatus}`,
      nextRetryAt:    isDead || !nextDelayMin
        ? null
        : new Date(Date.now() + nextDelayMin * 60_000),
    },
  })

  if (isDead) {
    console.error(
      `[EshopWebhook] DEAD LETTER logId=${logId} erpOrderNumber=${log.erpOrderNumber} — ` +
      `all ${3} attempts failed. Admin must intervene.`
    )
    // Alert admin via admin email (best-effort)
    await notifyAdminDeadLetter(log).catch(() => {})
  } else {
    console.warn(
      `[EshopWebhook] Attempt ${attemptCount}/3 failed for logId=${logId}, ` +
      `retry in ${nextDelayMin}min. Error: ${error ?? `HTTP ${httpStatus}`}`
    )
  }
}

async function notifyAdminDeadLetter(log: { id: string; erpOrderNumber: string; eshopOrderId: string }): Promise<void> {
  // Use existing admin email setting from the ERP DB
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } }).catch(() => null)
  const adminEmail = settings?.email || process.env.ADMIN_EMAIL
  if (!adminEmail) return

  // Simple fetch to a mail sending service — reuse existing Resend if configured
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    process.env.RESEND_FROM_EMAIL || 'noreply@weedej.cz',
      to:      adminEmail,
      subject: `[ERP ALERT] Dead-letter webhook — order ${log.erpOrderNumber}`,
      html:    `
        <p>Webhook doručení do e-shopu <strong>selhalo po 3 pokusech</strong>.</p>
        <ul>
          <li><strong>ERP objednávka:</strong> ${log.erpOrderNumber}</li>
          <li><strong>E-shop ID:</strong> ${log.eshopOrderId}</li>
          <li><strong>Log ID:</strong> ${log.id}</li>
        </ul>
        <p>Zákazník <strong>nebyl informován</strong> o odeslání zásilky. Zkontroluj ERP a ručně notifikuj zákazníka.</p>
      `,
    }),
  })
}
