/**
 * ERP → E-shop stock-update webhook
 *
 * Fire-and-forget: called after any InventoryItem creation (receipt or delivery).
 * The e-shop receives the affected ERP product IDs and re-fetches stock from ERP
 * to recalculate ProductVariant.stock values.
 *
 * No DB tracking — stock is idempotent (worst case: next manual sync catches up).
 * Signed with HMAC-SHA256 using ERP_WEBHOOK_SECRET (same secret as order-shipped).
 */

import crypto from 'crypto'

export async function notifyEshopStockUpdate(erpProductIds: string[]): Promise<void> {
  if (erpProductIds.length === 0) return

  const eshopUrl = process.env.ESHOP_URL?.replace(/\/$/, '')
  const secret   = process.env.ERP_WEBHOOK_SECRET

  if (!eshopUrl) {
    console.warn('[StockWebhook] ESHOP_URL not set — skipping stock update webhook')
    return
  }
  if (!secret) {
    console.warn('[StockWebhook] ERP_WEBHOOK_SECRET not set — skipping stock update webhook')
    return
  }

  const payload   = JSON.stringify({ productIds: erpProductIds })
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`

  // Fire-and-forget — never block the caller
  fetch(`${eshopUrl}/api/webhooks/erp/stock-update`, {
    method:  'POST',
    headers: {
      'Content-Type':    'application/json',
      'X-ERP-Signature': signature,
    },
    body:   payload,
    signal: AbortSignal.timeout(8_000),
  }).then(res => {
    if (!res.ok) console.warn(`[StockWebhook] E-shop responded ${res.status} for productIds=${erpProductIds.join(',')}`)
    else         console.log(`[StockWebhook] Stock update delivered for productIds=${erpProductIds.join(',')}`)
  }).catch(err => {
    console.warn(`[StockWebhook] Failed to notify e-shop: ${err?.message}`)
  })
}
