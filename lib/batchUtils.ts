// Shared batch utilities used by receipt process + purchase-order receive routes

import type { Prisma } from '@prisma/client'

export interface BatchInput {
  batchNumber:    string
  productionDate?: string | null
  expiryDate?:    string | null
  supplierLotRef?: string | null
}

/**
 * Find-or-create a Batch record within an existing Prisma transaction.
 * Returns the batch id, or null if batchInput is absent / batchNumber is empty.
 */
export async function findOrCreateBatch(
  tx: Prisma.TransactionClient,
  productId:   string,
  supplierId:  string | null | undefined,
  receivedDate: Date,
  batchInput:  BatchInput | null | undefined,
): Promise<string | null> {
  if (!batchInput?.batchNumber?.trim()) return null

  const batchNumber = batchInput.batchNumber.trim()

  const existing = await tx.batch.findUnique({
    where: { batchNumber_productId: { batchNumber, productId } },
    select: { id: true },
  })

  if (existing) return existing.id

  const created = await tx.batch.create({
    data: {
      batchNumber,
      productId,
      supplierId:     supplierId     || null,
      productionDate: batchInput.productionDate ? new Date(batchInput.productionDate) : null,
      expiryDate:     batchInput.expiryDate     ? new Date(batchInput.expiryDate)     : null,
      supplierLotRef: batchInput.supplierLotRef || null,
      receivedDate,
      status: 'active',
    },
    select: { id: true },
  })

  return created.id
}

/**
 * Select the best batch for an outbound movement using FEFO strategy.
 *
 * Priority order:
 *   1. Only `active` batches (quarantine / recalled / expired are blocked)
 *   2. Soonest expiry date first (First Expiry, First Out)
 *   3. No expiry date — treated as last-resort (sorted after all dated batches)
 *   4. Oldest receivedDate as tiebreaker (FIFO within same expiry tier)
 *
 * Returns the batch id to assign to the outbound InventoryItem,
 * or null if no active batch with positive stock exists for this product.
 */
export async function selectBatchForOutbound(
  tx:        Prisma.TransactionClient,
  productId: string,
): Promise<string | null> {
  const activeBatches = await tx.batch.findMany({
    where:  { productId, status: 'active' },
    select: { id: true, expiryDate: true, receivedDate: true },
  })

  if (activeBatches.length === 0) return null

  // Calculate current stock per batch (sum of all InventoryItems)
  const stockRows = await tx.inventoryItem.groupBy({
    by:    ['batchId'],
    where: { batchId: { in: activeBatches.map(b => b.id) } },
    _sum:  { quantity: true },
  })

  const stockMap = new Map(stockRows.map(r => [r.batchId as string, Number(r._sum.quantity ?? 0)]))

  // Keep only batches that still have positive stock
  const available = activeBatches.filter(b => (stockMap.get(b.id) ?? 0) > 0)

  if (available.length === 0) return null

  // FEFO sort: soonest expiry first, null-expiry last, FIFO tiebreak
  available.sort((a, b) => {
    const ea = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
    const eb = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
    if (ea !== eb) return ea - eb
    return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime()
  })

  return available[0].id
}
