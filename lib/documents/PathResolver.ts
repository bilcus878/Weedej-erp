export type DocumentType =
  | 'issued-invoices'
  | 'received-invoices'
  | 'customer-orders'
  | 'purchase-orders'
  | 'stock-receipts'
  | 'delivery-notes'
  | 'credit-notes'

// Maps each type to its canonical single-version filename (non-versioned docs).
const FIXED_FILENAME: Record<DocumentType, string> = {
  'issued-invoices':   'invoice.pdf',
  'received-invoices': 'invoice.pdf',
  'purchase-orders':   'order.pdf',
  'stock-receipts':    'receipt.pdf',
  'delivery-notes':    'delivery-note.pdf',
  'credit-notes':      'credit-note.pdf',
  'customer-orders':   '',           // versioned — filename computed per call
}

/**
 * Converts a document number into a safe directory name.
 * "2026/0010" → "2026-0010", special chars stripped.
 */
export function sanitizeDocNumber(docNumber: string): string {
  return docNumber
    .replace(/[\/\\]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Pure function — no I/O. Returns the relative storage path for a document.
 *
 * Versioned documents (customer-orders): pass `version` to get `order_v{N}.pdf`.
 * All other documents: single fixed filename, immutable after first write.
 *
 * @example
 * resolveDocumentPath('issued-invoices', '2026/0010', new Date('2026-05-01'))
 * // → "2026/05/issued-invoices/2026-0010/invoice.pdf"
 *
 * resolveDocumentPath('customer-orders', 'OBJ-2026-0025', new Date(), { version: 3 })
 * // → "2026/05/customer-orders/OBJ-2026-0025/order_v3.pdf"
 */
export function resolveDocumentPath(
  type: DocumentType,
  docNumber: string,
  date: Date,
  options: { version?: number } = {},
): string {
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const folder = sanitizeDocNumber(docNumber)

  let filename: string
  if (type === 'customer-orders') {
    const v = options.version ?? 1
    filename = `order_v${v}.pdf`
  } else {
    filename = FIXED_FILENAME[type]
  }

  return `${year}/${month}/${type}/${folder}/${filename}`
}

/**
 * Returns the directory path for a document (without filename).
 * Useful for listing all versions of a customer order.
 */
export function resolveDocumentDir(
  type: DocumentType,
  docNumber: string,
  date: Date,
): string {
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const folder = sanitizeDocNumber(docNumber)
  return `${year}/${month}/${type}/${folder}`
}
