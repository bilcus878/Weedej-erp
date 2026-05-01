export const IssuedInvoiceStatus = {
  ACTIVE: 'active',
  STORNO: 'storno',
} as const
export type IssuedInvoiceStatus = typeof IssuedInvoiceStatus[keyof typeof IssuedInvoiceStatus]

export const ReceivedInvoiceStatus = {
  DRAFT:  'draft',
  ACTIVE: 'active',
  STORNO: 'storno',
} as const
export type ReceivedInvoiceStatus = typeof ReceivedInvoiceStatus[keyof typeof ReceivedInvoiceStatus]

// Legacy alias retained for gradual migration.
export const InvoiceStatus = {
  DRAFT:  'draft',
  ISSUED: 'issued',
  PAID:   'paid',
  STORNO: 'storno',
} as const
export type InvoiceStatus = typeof InvoiceStatus[keyof typeof InvoiceStatus]
