/**
 * ERP → E-shop stock-update webhook (push model)
 *
 * Called after any InventoryItem creation (receipt in, delivery out, eshop shipped).
 * The ERP calculates current stock and pushes it — the e-shop writes it directly,
 * no callback to ERP needed.
 *
 * Payload: { products: [{ erpProductId, stock, unit }] }
 * Signed:  HMAC-SHA256 (ERP_WEBHOOK_SECRET)
 *
 * Required env vars (set in ERP Vercel dashboard):
 *   ESHOP_URL            — e.g. https://weedej.cz
 *   ERP_WEBHOOK_SECRET   — same secret set in e-shop env
 */

import crypto from 'crypto'
import { prisma } from './prisma'
import { calculateCurrentStock } from './stockCalculation'

export interface StockUpdateProduct {
  erpProductId: string
  stock:        number
  unit:         string
}

/**
 * Calculates current stock for each productId and fires a signed webhook
 * to the e-shop. Fire-and-forget — never blocks the caller.
 */
export async function notifyEshopStockUpdate(erpProductIds: string[]): Promise<void> {
  if (erpProductIds.length === 0) return

  const eshopUrl = process.env.ESHOP_URL?.replace(/\/$/, '')
  const secret   = process.env.ERP_WEBHOOK_SECRET

  if (!eshopUrl) {
    console.warn('[StockWebhook] ESHOP_URL not set — skipping. Set it in ERP Vercel env vars.')
    return
  }
  if (!secret) {
    console.warn('[StockWebhook] ERP_WEBHOOK_SECRET not set — skipping. Set it in ERP Vercel env vars.')
    return
  }

  // Calculate current stock for each affected product (after the transaction)
  const products = await prisma.product.findMany({
    where:  { id: { in: erpProductIds } },
    select: { id: true, unit: true },
  })

  const stockUpdates: StockUpdateProduct[] = await Promise.all(
    products.map(async (p) => ({
      erpProductId: p.id,
      stock:        await calculateCurrentStock(p.id),
      unit:         p.unit ?? 'ks',
    }))
  )

  const payload   = JSON.stringify({ products: stockUpdates })
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`

  fetch(`${eshopUrl}/api/webhooks/erp/stock-update`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-ERP-Signature': signature },
    body:    payload,
    signal:  AbortSignal.timeout(8_000),
  }).then(res => {
    if (!res.ok) console.warn(`[StockWebhook] E-shop responded ${res.status}`)
    else         console.log(`[StockWebhook] Pushed stock for: ${erpProductIds.join(', ')}`)
  }).catch(err => {
    console.warn(`[StockWebhook] Network error: ${err?.message}`)
  })
}
