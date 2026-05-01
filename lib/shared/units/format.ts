/** Format a quantity with its unit, auto-converting g→kg and ml→l at 1000+ */
export function formatQuantity(quantity: number | string, unit: string): string {
  const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity

  if (unit === 'g' && num >= 1000) {
    return `${(num / 1000).toFixed(2)} kg`
  }

  if (unit === 'ml' && num >= 1000) {
    return `${(num / 1000).toFixed(2)} l`
  }

  return `${num} ${unit}`
}
