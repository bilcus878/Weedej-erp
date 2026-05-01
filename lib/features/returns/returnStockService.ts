/**
 * Stock movements for return requests.
 *
 * When goods are received and an item is approved for restock, a positive
 * InventoryItem is created — exactly the same mechanism used by receipts.
 * The note field encodes the return traceability so the inventory journal
 * stays clean without requiring schema changes to InventoryItem.
 */

import { Prisma } from '@prisma/client'

interface RestockItemInput {
  returnRequestId: string
  returnNumber:    string
  itemId:          string
  productId:       string
  approvedQty:     number
  unit:            string
  condition:       string | null
}

/**
 * Creates a positive InventoryItem for each approved return item and links it
 * back via ReturnRequestItem.restockInventoryItemId.
 *
 * Must be called inside a Prisma transaction.
 */
export async function restockReturnItems(
  tx: Prisma.TransactionClient,
  items: RestockItemInput[]
): Promise<void> {
  for (const item of items) {
    if (item.approvedQty <= 0) continue

    const conditionLabel = item.condition
      ? ` (${item.condition})`
      : ''

    const inventoryItem = await tx.inventoryItem.create({
      data: {
        productId:     item.productId,
        quantity:      item.approvedQty,
        unit:          item.unit,
        purchasePrice: 0,  // return — no purchase cost recorded here
        date:          new Date(),
        note:          `Vráceno z reklamace ${item.returnNumber}${conditionLabel}`,
      },
    })

    await tx.returnRequestItem.update({
      where: { id: item.itemId },
      data:  { restockInventoryItemId: inventoryItem.id },
    })
  }
}
