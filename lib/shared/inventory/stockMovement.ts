/**
 * CANONICAL STOCK MOVEMENT CALCULATION — single source of truth for inventory math.
 *
 * Movement model (2026):
 *   - Inflows:  InventoryItems with POSITIVE quantity (receipt from purchase order)
 *   - Outflows: InventoryItems with NEGATIVE quantity (issued from delivery note)
 *   - Physical stock = sum of ALL InventoryItems (positive + negative)
 *
 * Variant items (unit='ks' + variantValue in g/ml) require conversion:
 *   reservedBase = quantity × variantValue  (e.g. 2 ks × 3 ml = 6 ml)
 *
 * RULE: ALL stock calculations must import from this file only.
 * DO NOT import from @/lib/stockCalculation — that file is a shim.
 *
 * Import path: @/lib/shared/inventory/stockMovement
 */

import { prisma } from '@/lib/prisma'

// ── Current physical stock ────────────────────────────────────────────────────

/**
 * Sum of ALL InventoryItems for a product (positive inflows + negative outflows).
 */
export async function calculateCurrentStock(productId: string): Promise<number> {
  const total = await prisma.inventoryItem.aggregate({
    where: { productId },
    _sum:  { quantity: true },
  })
  return Number(total._sum.quantity ?? 0)
}

// ── Expected stock from pending purchase orders ───────────────────────────────

/**
 * Remaining quantity from PurchaseOrderItems where PO status is
 * pending | confirmed | partially_received.
 *
 * Remaining = ordered - alreadyReceived
 */
export async function calculateExpectedStock(productId: string): Promise<number> {
  const orderItems = await prisma.purchaseOrderItem.findMany({
    where: {
      productId,
      purchaseOrder: {
        status: { in: ['pending', 'confirmed', 'partially_received'] },
      },
    },
    select: { quantity: true, alreadyReceivedQuantity: true },
  })

  return orderItems.reduce((sum, item) => {
    const remaining = Number(item.quantity) - Number(item.alreadyReceivedQuantity)
    return sum + remaining
  }, 0)
}

/**
 * Physical stock + expected stock from open purchase orders.
 */
export async function calculateTotalExpectedStock(productId: string): Promise<number> {
  const [current, expected] = await Promise.all([
    calculateCurrentStock(productId),
    calculateExpectedStock(productId),
  ])
  return current + expected
}

// ── Reserved stock ────────────────────────────────────────────────────────────

/**
 * Sum of active reservations in base units (g/ml/ks).
 *
 * Variant items (unit='ks' with variantValue set) convert:
 *   reservedBase = quantity × variantValue
 * Plain items: reservedBase = quantity
 *
 * Intentionally does NOT use aggregate._sum — per-row calculation needed for variants.
 */
export async function calculateReservedStock(productId: string): Promise<number> {
  const reservations = await prisma.reservation.findMany({
    where:  { productId, status: 'active' },
    select: { quantity: true, unit: true, variantValue: true, variantUnit: true },
  })

  return reservations.reduce((sum, r) => {
    const qty       = Number(r.quantity)
    const vv        = r.variantValue != null ? Number(r.variantValue) : null
    const vu        = r.variantUnit
    const isVariant = r.unit === 'ks' && vv != null && vu != null && vu !== 'ks'
    return sum + (isVariant ? qty * vv! : qty)
  }, 0)
}

// ── Available stock ───────────────────────────────────────────────────────────

/**
 * Available = Physical − Reserved
 */
export async function calculateAvailableStock(productId: string): Promise<number> {
  const [physical, reserved] = await Promise.all([
    calculateCurrentStock(productId),
    calculateReservedStock(productId),
  ])
  return physical - reserved
}

// ── Delivery check ────────────────────────────────────────────────────────────

/**
 * Can this quantity be dispatched?
 * Returns the current stock for context regardless of the decision.
 */
export async function canDeliverQuantity(
  productId:     string,
  quantity:      number,
  allowNegative: boolean = false,
): Promise<{
  canDeliver:   boolean
  currentStock: number
  message?:     string
}> {
  const currentStock = await calculateCurrentStock(productId)

  if (allowNegative) return { canDeliver: true, currentStock }

  if (currentStock < quantity) {
    const product = await prisma.product.findUnique({
      where:  { id: productId },
      select: { name: true, unit: true },
    })
    return {
      canDeliver:   false,
      currentStock,
      message: `Nedostatečný sklad pro ${product?.name ?? 'produkt'}. `
             + `Aktuální stav: ${currentStock} ${product?.unit ?? 'ks'}, `
             + `požadováno: ${quantity} ${product?.unit ?? 'ks'}`,
    }
  }

  return { canDeliver: true, currentStock }
}

// ── Bulk stock summary (inventory page) ──────────────────────────────────────

export interface ProductStockSummary {
  productId:          string
  productName:        string
  unit:               string
  physicalStock:      number
  reservedStock:      number
  availableStock:     number
  expectedStock:      number
  totalExpectedStock: number
}

/**
 * Efficient bulk load for the inventory list page.
 * Single query per data source, then in-memory aggregation.
 */
export async function getAllProductsStock(): Promise<ProductStockSummary[]> {
  const [products, inventoryAgg, reservations, orderItems] = await Promise.all([
    prisma.product.findMany({
      where:  { active: true },
      select: { id: true, name: true, unit: true },
    }),
    prisma.inventoryItem.groupBy({
      by:   ['productId'],
      _sum: { quantity: true },
    }),
    prisma.reservation.findMany({
      where:  { status: 'active' },
      select: { productId: true, quantity: true, unit: true, variantValue: true, variantUnit: true },
    }),
    prisma.purchaseOrderItem.findMany({
      where:  { purchaseOrder: { status: { in: ['pending', 'confirmed', 'partially_received'] } } },
      select: { productId: true, quantity: true, alreadyReceivedQuantity: true },
    }),
  ])

  const physicalMap = new Map<string, number>()
  for (const row of inventoryAgg) {
    physicalMap.set(row.productId, Number(row._sum.quantity ?? 0))
  }

  const reservedMap = new Map<string, number>()
  for (const r of reservations) {
    const qty       = Number(r.quantity)
    const vv        = r.variantValue != null ? Number(r.variantValue) : null
    const vu        = r.variantUnit
    const isVariant = r.unit === 'ks' && vv != null && vu != null && vu !== 'ks'
    const base      = isVariant ? qty * vv! : qty
    reservedMap.set(r.productId, (reservedMap.get(r.productId) ?? 0) + base)
  }

  const expectedMap = new Map<string, number>()
  for (const oi of orderItems) {
    const remaining = Number(oi.quantity) - Number(oi.alreadyReceivedQuantity)
    if (oi.productId) {
      expectedMap.set(oi.productId, (expectedMap.get(oi.productId) ?? 0) + remaining)
    }
  }

  return products.map(product => {
    const physicalStock  = physicalMap.get(product.id)  ?? 0
    const reservedStock  = reservedMap.get(product.id)  ?? 0
    const availableStock = physicalStock - reservedStock
    const expectedStock  = expectedMap.get(product.id)  ?? 0
    return {
      productId:          product.id,
      productName:        product.name,
      unit:               product.unit,
      physicalStock,
      reservedStock,
      availableStock,
      expectedStock,
      totalExpectedStock: availableStock + expectedStock,
    }
  })
}
