/**
 * CANONICAL DOCUMENT NUMBERING — single source of truth for the entire ERP system.
 *
 * ON-COMMIT system: the number is generated ONLY on successful DB commit,
 * never on form open. Uses atomic DB increment to guarantee uniqueness.
 *
 * Format: {Prefix}{Year}{4-digit-sequence}
 * Example: PR20250001, VYD20250042, VF20260001
 *
 * Czech accounting standards require continuous, uninterrupted numbering sequences
 * per document type per calendar year.
 *
 * RULE: ALL document number generation must call getNextDocumentNumber() from this file.
 * DO NOT import from @/lib/documentSeries or @/lib/documentNumbering — those are shims.
 *
 * Import path: @/lib/shared/documents/documentSeries
 */

import { prisma }  from '@/lib/prisma'
import { Prisma }  from '@prisma/client'

// ── Document type → prefix map ────────────────────────────────────────────────

const DOCUMENT_PREFIXES: Record<string, string> = {
  'receipt':           'PR',   // Příjemky
  'delivery-note':     'VYD',  // Výdejky (kebab-case)
  'delivery_note':     'VYD',  // Výdejky (snake_case)
  'purchase-order':    'OBJ',  // Objednávky dodavatelům (kebab-case)
  'purchase_order':    'OBJ',  // Objednávky dodavatelům (snake_case)
  'customer-order':    'ZAK',  // Objednávky od zákazníků (kebab-case)
  'customer_order':    'ZAK',  // Objednávky od zákazníků (snake_case)
  'eshop-order':       'ESH',  // Objednávky z e-shopu (kebab-case)
  'eshop_order':       'ESH',  // Objednávky z e-shopu (snake_case)
  'received-invoice':  'FP',   // Přijaté faktury (kebab-case)
  'received_invoice':  'FP',   // Přijaté faktury (snake_case)
  'issued-invoice':    'VF',   // Vystavené faktury (kebab-case)
  'issued_invoice':    'VF',   // Vystavené faktury (snake_case)
  'credit-note':       'DOB',  // Dobropisy (kebab-case)
  'credit_note':       'DOB',  // Dobropisy (snake_case)
  'transaction':       'FAK',  // @deprecated — use issued-invoice
  'inventura':         'INV',  // Inventury
  'return-request':    'RET',  // Reklamace / vrácení zboží
}

export type DocumentType =
  | 'receipt'
  | 'delivery-note'
  | 'delivery_note'
  | 'purchase-order'
  | 'purchase_order'
  | 'customer-order'
  | 'customer_order'
  | 'eshop-order'
  | 'eshop_order'
  | 'received-invoice'
  | 'received_invoice'
  | 'issued-invoice'
  | 'issued_invoice'
  | 'credit-note'
  | 'credit_note'
  | 'transaction'
  | 'inventura'
  | 'return-request'

// ── Core numbering functions ──────────────────────────────────────────────────

/**
 * Atomically get the next document number and increment the counter.
 *
 * MUST be called INSIDE a Prisma transaction — Postgres guarantees uniqueness
 * across concurrent requests via atomic upsert.
 *
 * @param documentType  — Document type key
 * @param tx            — Active Prisma transaction client (required)
 * @param documentDate  — Document date (optional, defaults to today). The YEAR determines the series.
 * @returns             Generated document number e.g. "PR20250001"
 */
export async function getNextDocumentNumber(
  documentType: DocumentType,
  tx:           Prisma.TransactionClient,
  documentDate?: Date,
): Promise<string> {
  const year   = documentDate ? documentDate.getFullYear() : new Date().getFullYear()
  const prefix = DOCUMENT_PREFIXES[documentType]

  if (!prefix) {
    throw new Error(`Unknown document type: ${documentType}`)
  }

  const series = await tx.documentSeries.upsert({
    where:  { documentType_year: { documentType, year } },
    update: { lastNumber: { increment: 1 } },
    create: { documentType, year, lastNumber: 1 },
  })

  return `${prefix}${year}${String(series.lastNumber).padStart(4, '0')}`
}

/**
 * Preview the next document number WITHOUT incrementing the counter.
 * Use only for UI display — never for actual document creation.
 */
export async function previewNextDocumentNumber(
  documentType: DocumentType,
  documentDate?: Date,
): Promise<string> {
  const year   = documentDate ? documentDate.getFullYear() : new Date().getFullYear()
  const prefix = DOCUMENT_PREFIXES[documentType]

  const series = await prisma.documentSeries.findUnique({
    where: { documentType_year: { documentType, year } },
  })

  const next   = series ? series.lastNumber + 1 : 1
  return `${prefix}${year}${String(next).padStart(4, '0')}`
}

/**
 * Get the current series state for a document type and year.
 * Useful for admin/audit views.
 */
export async function getCurrentSeriesInfo(
  documentType: DocumentType,
  year?:        number,
): Promise<{ year: number; lastNumber: number; nextNumber: string } | null> {
  const targetYear = year ?? new Date().getFullYear()
  const prefix     = DOCUMENT_PREFIXES[documentType]

  const series = await prisma.documentSeries.findUnique({
    where: { documentType_year: { documentType, year: targetYear } },
  })

  if (!series) return null

  const next = series.lastNumber + 1
  return {
    year:       targetYear,
    lastNumber: series.lastNumber,
    nextNumber: `${prefix}${targetYear}${String(next).padStart(4, '0')}`,
  }
}
