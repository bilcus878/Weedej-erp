// Variant fulfillment conversion utilities.
// Single source of truth for pack ↔ base-unit math (g, ml, ks).

export interface VariantItemInput {
  quantity:       number
  unit:           string
  shippedQuantity: number
  shippedBaseQty:  number
  variantValue:   number | null
  variantUnit:    string | null
}

export interface ResolvedQuantities {
  isVariant:         boolean
  baseUnit:          string
  orderedPacks:      number  // quantity in packs (as ordered)
  orderedBaseQty:    number  // total base units ordered (packs × variantValue)
  shippedBaseQty:    number  // base units already shipped
  remainingBaseQty:  number  // base units still to ship
  shippedPacks:      number  // informational: how many whole packs shipped
}

export function resolveItemQuantities(item: VariantItemInput): ResolvedQuantities {
  const isVariant  = item.unit === 'ks' && item.variantValue != null && item.variantUnit != null && item.variantUnit !== 'ks'
  const vv         = item.variantValue ?? 1
  const baseUnit   = (isVariant ? item.variantUnit : item.unit) ?? item.unit

  const orderedPacks     = Number(item.quantity)
  const orderedBaseQty   = isVariant ? Math.round(orderedPacks * vv * 1000) / 1000 : orderedPacks
  const shippedBaseQty   = Number(item.shippedBaseQty ?? item.shippedQuantity)
  const remainingBaseQty = Math.max(0, Math.round((orderedBaseQty - shippedBaseQty) * 1000) / 1000)
  const shippedPacks     = isVariant && vv > 0 ? shippedBaseQty / vv : shippedBaseQty

  return { isVariant, baseUnit, orderedPacks, orderedBaseQty, shippedBaseQty, remainingBaseQty, shippedPacks }
}

// Parse variant metadata from ERP product name pattern "ProductName — 5g"
// Supports: g, ml, ks
export function extractVariantFromName(
  productName: string | null | undefined
): { variantValue: number | null; variantUnit: string | null } {
  if (!productName?.includes(' — ')) return { variantValue: null, variantUnit: null }
  const label = productName.split(' — ').slice(1).join(' — ').trim()
  const match  = label.match(/^(\d+(?:\.\d+)?)\s*(g|ml|ks)$/i)
  if (!match) return { variantValue: null, variantUnit: null }
  const unit = match[2].toLowerCase()
  if (unit === 'ks') return { variantValue: null, variantUnit: null } // ks is not a variant base unit
  return { variantValue: parseFloat(match[1]), variantUnit: unit }
}

// Check if a CustomerOrderItem is fully shipped (variant-aware)
export function isItemFullyShipped(item: {
  quantity:      number | string
  shippedQuantity: number | string
  shippedBaseQty?: number | string | null
  variantValue?: number | string | null
  variantUnit?:  string | null
  unit?:         string | null
}): boolean {
  const vv = item.variantValue != null ? Number(item.variantValue) : null
  const isVariant = vv != null && item.variantUnit != null && item.variantUnit !== 'ks'
    && (item.unit == null || item.unit === 'ks')
  if (isVariant && vv) {
    const orderedBase  = Number(item.quantity) * vv
    const shippedBase  = Number(item.shippedBaseQty ?? 0)
    return shippedBase >= orderedBase - 0.001
  }
  return Number(item.shippedQuantity) >= Number(item.quantity) - 0.001
}
