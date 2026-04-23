/**
 * Converts a raw base-unit quantity into pack count for variant products.
 * Variant products follow the "ProductName — {size}{unit}" naming convention (e.g. "CBD Oil — 5g").
 * For non-'ks' units, the variant label's leading number is treated as the pack size.
 */
export function calcPackCount(
  quantity: number,
  productName: string | null | undefined,
  unit: string,
): number {
  if (productName?.includes(' — ') && unit !== 'ks') {
    const variantLabel = productName.split(' — ').slice(-1)[0]
    const match = variantLabel.match(/^([\d.]+)/)
    if (match) {
      const packSize = parseFloat(match[1])
      if (packSize > 0) return Math.round((quantity / packSize) * 1000) / 1000
    }
  }
  return quantity
}
