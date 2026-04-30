// ─── VAT Summary Builder ──────────────────────────────────────────────────────
// Groups documents by DUZP period (YYYY-MM), VAT rate and type.
// Used by both the XLSX renderer and the CSV renderer.

import type { AccountingDocument, DocType, VatSummaryRow } from './types'

export function buildVatSummary(docs: Map<DocType, AccountingDocument[]>): VatSummaryRow[] {
  const key = (period: string, vatRate: number, docType: DocType) =>
    `${period}|${vatRate}|${docType}`

  const map = new Map<string, VatSummaryRow>()

  for (const [docType, rows] of docs) {
    for (const doc of rows) {
      const period = doc.taxPointDate.slice(0, 7) // YYYY-MM

      for (const line of doc.vatLines) {
        const k       = key(period, line.vatRate, docType)
        const existing = map.get(k)
        if (existing) {
          existing.docCount++
          existing.totalTaxBase += line.taxBase
          existing.totalVat     += line.vatAmount
          existing.totalGross   += line.grossAmount
        } else {
          map.set(k, {
            period,
            vatRate:      line.vatRate,
            docType,
            docCount:     1,
            totalTaxBase: line.taxBase,
            totalVat:     line.vatAmount,
            totalGross:   line.grossAmount,
          })
        }
      }

      // Documents with no VAT lines but a total amount
      if (doc.vatLines.length === 0 && doc.totalAmount > 0) {
        const k       = key(period, 0, docType)
        const existing = map.get(k)
        if (existing) {
          existing.docCount++
          existing.totalTaxBase += doc.totalTaxBase
          existing.totalVat     += doc.totalVat
          existing.totalGross   += doc.totalAmount
        } else {
          map.set(k, {
            period,
            vatRate:      0,
            docType,
            docCount:     1,
            totalTaxBase: doc.totalTaxBase,
            totalVat:     doc.totalVat,
            totalGross:   doc.totalAmount,
          })
        }
      }
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.period !== b.period)  return a.period.localeCompare(b.period)
    if (a.docType !== b.docType) return a.docType.localeCompare(b.docType)
    return b.vatRate - a.vatRate
  })
}
