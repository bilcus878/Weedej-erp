export const ReceiptStatus = {
  DRAFT:  'draft',
  ACTIVE: 'active',
  STORNO: 'storno',
} as const
export type ReceiptStatus = typeof ReceiptStatus[keyof typeof ReceiptStatus]
