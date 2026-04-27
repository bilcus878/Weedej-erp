export interface ShippingMethodInput {
  price:         number
  freeThreshold: number | null
  codFee:        number
}

export interface ShippingCalcResult {
  basePrice:    number
  codSurcharge: number
  total:        number
  isFree:       boolean
}

export function calculateShipping(
  subtotal:  number,
  method:    ShippingMethodInput,
  isCod:     boolean = false,
): ShippingCalcResult {
  const isFree = method.freeThreshold !== null && subtotal >= method.freeThreshold
  const basePrice    = isFree ? 0 : method.price
  const codSurcharge = isCod ? method.codFee : 0
  return {
    basePrice,
    codSurcharge,
    total:  basePrice + codSurcharge,
    isFree,
  }
}
