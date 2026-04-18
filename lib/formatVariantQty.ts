import { formatQuantity } from './utils'

/**
 * Format quantity for display.
 * Eshop variant names use the pattern "ProductName — variantLabel" (e.g. "CBD Olej — 5g").
 * For those items display "Nx variantLabel" (e.g. "1x 5g") instead of "1 ks".
 * For items where the variantLabel itself already starts with a number×something
 * (e.g. "3ml × 2"), use the variantLabel as-is without prepending quantity.
 */
export function formatVariantQty(
  quantity: number,
  productName: string | null | undefined,
  unit: string
): string {
  const name = productName ?? ''
  if (name.includes(' — ')) {
    const variantPart = name.split(' — ').slice(1).join(' — ')
    if (/^\d+[xX×]/.test(variantPart)) return variantPart
    return `${quantity}x ${variantPart}`
  }
  return formatQuantity(quantity, unit)
}
