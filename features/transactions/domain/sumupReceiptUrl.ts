/**
 * Parses a SumUp POS receipt URN into a public HTML receipt URL.
 * Format: urn:sumup:pos:sale:{merchantCode}:{receiptId}[:|;]
 */
export function parseSumUpReceiptUrl(receiptId: string): string | null {
  const match = receiptId.match(/urn:sumup:pos:sale:([^:]+):([a-f0-9-]{36})[:;]/)
  if (!match) return null
  return `https://sales-receipt.sumup.com/pos/public/v1/${match[1]}/receipt/${match[2]}?format=html`
}
