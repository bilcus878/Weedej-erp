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
